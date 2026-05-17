import { Api, Serialize } from "@proton/js";
import chunkFn from "lodash/chunk";
import { Liquidation, TExtendedAsset } from "./@types/tables";
import { decomposeAsset, extAsset2asset, formatAsset } from "./asset";
import { LENDING_CONTRACT } from "./constants";
import { fetchBalance, fetchMarkets, fetchShares } from "./tables";
import { sendTransaction } from "./transaction";
import { appendLog } from "./logger";
import BigNumber from "bignumber.js";

const INITIAL_CHUNK_SIZE = 50;

const parseFindLiquidationMemo = (
  memo: string
): Liquidation | undefined => {
  const [
    status,
    user,
    debtAmount,
    debtExtSymbol,
    seizeSymbolCode
  ] = memo.split(` `);

  if (status !== `found`) return undefined;

  // just use the recommendation from the smart contract which returns
  // the highest debt asset + highest collateral asset
  const [debtSymbol, debtContract] = debtExtSymbol.split(`@`);
  const debtAsset = decomposeAsset(`${debtAmount} ${debtSymbol}`);

  if (!debtAsset.amount.gt(0)) return undefined;

  return {
    user,
    debtExtAsset: {
      amount: debtAsset.amount,
      extSymbol: {
        contract: debtContract,
        sym: {
          code: debtAsset.symbol.code,
          precision: debtAsset.symbol.precision
        }
      }
    },
    seizeSymbol: seizeSymbolCode
  };
};

// Probe a set of borrowers via the on-chain `findliq` action.
// The contract always aborts the transaction with an assertion:
//   - `{find_liquidation}: ...` carries the result (found / notfound)
//   - any other assertion is a contract-side failure for one of the
//     borrowers in the batch (e.g. "market does not exist for share symbol")
// In the latter case we bisect the chunk to isolate the offending borrower
// and log it, so a single bad account cannot block the whole bot.
const checkChunk = (api: Api) => async (
  chunk: string[],
  authorization: Serialize.Authorization
): Promise<Liquidation[]> => {
  if (chunk.length === 0) return [];

  const actions = [
    {
      account: LENDING_CONTRACT,
      authorization: [authorization],
      name: "findliq",
      data: {
        borrowers: chunk
      }
    }
  ];

  try {
    await sendTransaction(api)(actions);
    // findliq is expected to always assert; reaching here means no result
    return [];
  } catch (error) {
    const message: string = error ? error.message : ``;
    const [, memo] = message.split(`{find_liquidation}: `);

    if (memo) {
      const liquidation = parseFindLiquidationMemo(memo);
      return liquidation ? [liquidation] : [];
    }

    // Unexpected assertion from the contract. Bisect to isolate the bad
    // borrower so the rest of the batch can still be processed.
    if (chunk.length === 1) {
      const borrower = chunk[0];
      const summary = `borrower=${borrower} error=${message.replace(/\s+/g, " ").trim()}`;
      console.warn(`findliq failed for single borrower: ${summary}`);
      appendLog("findliq-errors.log", summary);
      return [];
    }

    const mid = Math.floor(chunk.length / 2);
    const left = await checkChunk(api)(chunk.slice(0, mid), authorization);
    const right = await checkChunk(api)(chunk.slice(mid), authorization);
    return [...left, ...right];
  }
};

export const findLiquidations = (api: Api) => async (
  accounts: string[],
  authorization: Serialize.Authorization
): Promise<Liquidation[]> => {
  const chunks = chunkFn(accounts, INITIAL_CHUNK_SIZE);
  const liquidations: Liquidation[] = [];

  for (const chunk of chunks) {
    const found = await checkChunk(api)(chunk, authorization);
    liquidations.push(...found);
  }

  return liquidations;
};

export const redeemShare = (api: Api) => async (
  share: TExtendedAsset,
  authorization: Serialize.Authorization
) => {
  console.log(`share`, formatAsset(extAsset2asset(share)));

  // redeem could fail due to no available liquidity
  for (let i = 0; i < 10; i++) {
    try {
      const quantity = formatAsset({
        amount: share.amount.div(Math.pow(2, i)),
        symbol: share.extSymbol.sym
      });
      await sendTransaction(api)([
        {
          account: LENDING_CONTRACT,
          authorization: [authorization],
          name: "redeem",
          data: {
            redeemer: authorization.actor,
            token: {
              quantity: quantity,
              contract: share.extSymbol.contract
            }
          }
        }
      ]);
      console.log(`Redeemed ${quantity}`);
      break;
    } catch (error) {
      if (!error) {
        console.error("No error found while redeeming");
        break;
      }

      if (
        !/assertion failure with message: not enough available/.test(
          error.message
        )
      ) {
        console.warn(`Redeem failed:`, error.message);
        break;
      }
      // otherwise try again with less to redeem
    }
  }
};

export const performLiquidation = (api: Api) => async (
  user: string,
  debtExtAsset: TExtendedAsset,
  seizeSymbol: string,
  authorization: Serialize.Authorization
) => {
  // adjust the max debtExtAsset quantity because it's right at the threshold
  const adjustedAsset = {
    amount: debtExtAsset.amount.times(99).div(100),
    symbol: debtExtAsset.extSymbol.sym
  };

  // Fetch markets
  const markets = await fetchMarkets(api)();
  const market = markets.find(
    market =>
      market.underlying_symbol.sym.code === debtExtAsset.extSymbol.sym.code &&
      market.underlying_symbol.sym.precision ===
        debtExtAsset.extSymbol.sym.precision &&
      market.underlying_symbol.contract === debtExtAsset.extSymbol.contract
  );
  if (!market) {
    throw new Error("Market not found");
  }

  // redeem if we own shares of this underlying
  // as bot ends up with lots of seized collateral
  const shares = await fetchShares(api)(authorization.actor);
  const share = shares.find(
    s => s.extSymbol.sym.code === market.share_symbol.sym.code
  );
  if (share && share.amount.isGreaterThan(0)) {
    await redeemShare(api)(share, authorization);
  }

  const ownUnderlyingBalance = await fetchBalance(api)(
    authorization.actor,
    debtExtAsset.extSymbol
  );
  console.log(
    `ownUnderlyingBalance`,
    formatAsset(extAsset2asset(ownUnderlyingBalance))
  );

  // Try atleast one
  // cap amount to repay to own balance
  if (adjustedAsset.amount.isGreaterThan(ownUnderlyingBalance.amount)) {
    adjustedAsset.amount = ownUnderlyingBalance.amount;
  }
  console.log(`repaying`, formatAsset(adjustedAsset), 'for', user);
  if (adjustedAsset.amount.isZero()) {
    throw new Error(
      `Bot does not have any tokens to repay: ${formatAsset(adjustedAsset)}`
    );
  }

  const actions = [
    {
      account: LENDING_CONTRACT,
      authorization: [authorization],
      name: "entermarkets",
      data: {
        payer: authorization.actor,
        user: authorization.actor,
        markets: [market.share_symbol.sym.code, seizeSymbol]
      }
    },
    {
      account: debtExtAsset.extSymbol.contract,
      authorization: [authorization],
      name: "transfer",
      data: {
        from: authorization.actor,
        to: LENDING_CONTRACT,
        quantity: formatAsset(adjustedAsset),
        memo: `liquidate,${user},${seizeSymbol}`
      }
    }
  ];
  //console.dir(actions, { depth: null })
  return await sendTransaction(api)(actions);
};
