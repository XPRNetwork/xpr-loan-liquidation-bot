import { Api, Serialize } from "@protonprotocol/protonjs";
import chunkFn from "lodash/chunk";
import { Liquidation, TExtendedAsset } from "./@types/tables";
import { decomposeAsset, extAsset2asset, formatAsset } from "./asset";
import { LENDING_CONTRACT } from "./constants";
import { fetchBalance, fetchMarkets, fetchShares } from "./tables";
import { sendTransaction } from "./transaction";

export const findLiquidations = (api: Api) => async (
  accounts: string[],
  authorization: Serialize.Authorization
): Promise<Liquidation[]> => {
  // call the check-liquidation action which accruess all debt and checks each user
  const chunks = chunkFn(accounts, 100); // TODO: adjust this chunk size if timing out
  const liquidations = []

  for (const chunk of chunks) {
    const actions = [
      {
        account: LENDING_CONTRACT,
        authorization: [authorization],
        name: "findliq",
        data: {
          borrowers: chunk,
        },
      },
    ];

    try {
      await sendTransaction(api)(actions);
    } catch (error) {
      // try to parse error
      const message: string = error ? error.message : ``;
      const [, memo] = message.split(`{find_liquidation}: `);
      if (!memo) {
        // unknown RPC error, we should always be able to get an assertion error
        throw error;
      }

      const [
        status,
        user,
        debtAmount,
        debtExtSymbol,
        seizeSymbolCode,
      ] = memo.split(` `);

      if (status === `found`) {
        // just use the recommendation from the smart contract which returns
        // the highest debt asset + highest collateral asset
        // more sophisticated methods would also check if liquidator has
        // enough balance for this
        const [debtSymbol, debtContract] = debtExtSymbol.split(`@`);
        const debtAsset = decomposeAsset(`${debtAmount} ${debtSymbol}`);

        liquidations.push({
          user,
          debtExtAsset: {
            amount: debtAsset.amount,
            extSymbol: { contract: debtContract, sym: { code: debtAsset.symbol.code, precision: debtAsset.symbol.precision }},
          },
          seizeSymbol: seizeSymbolCode,
        });
      }
      // otherwise continue the loop for the next chunk
    }
  }

  return liquidations;
};


export const redeemShare = (api: Api) => async (
  share: TExtendedAsset,
  authorization: Serialize.Authorization
) => {
  console.log(`share`, formatAsset(extAsset2asset(share)));

  // redeem could fail due to no available liquidity
  for(let i = 0; i < 10; i++){
    try {
      const quantity = formatAsset({
        amount: share.amount.div(Math.pow(2, i)),
        symbol: share.extSymbol.sym,
      })
      await sendTransaction(api)([
        {
          account: LENDING_CONTRACT,
          authorization: [authorization],
          name: "redeem",
          data: {
            redeemer: authorization.actor,
            token: {
              quantity: quantity,
              contract: share.extSymbol.contract,
            },
          },
        },
      ]);
      console.log(`Redeemed ${quantity}`)
      break;
    } catch (error) {
      if(!/assertion failure with message: not enough available/.test(error.message)) {
        console.warn(`Redeem failed:`, error.message);
        break;
      }
      // otherwise try again with less to redeem
    }
  }
}

export const performLiquidation = (api: Api) => async (
  user: string,
  debtExtAsset: TExtendedAsset,
  seizeSymbol: string,
  authorization: Serialize.Authorization
) => {
  // adjust the max debtExtAsset quantity because it's right at the threshold
  const adjustedAsset = {
    amount: debtExtAsset.amount.times(99).div(100),
    symbol: debtExtAsset.extSymbol.sym,
  };

  // Fetch markets
  const markets = await fetchMarkets(api)()
  const market = markets.find(
    market => market.underlying_symbol.sym.code === debtExtAsset.extSymbol.sym.code &&
              market.underlying_symbol.sym.precision === debtExtAsset.extSymbol.sym.precision &&
              market.underlying_symbol.contract === debtExtAsset.extSymbol.contract
  )
  if (!market) {
    throw new Error('Market not found')
  }

  // redeem if we own shares of this underlying
  // as bot ends up with lots of seized collateral
  const shares = await fetchShares(api)(authorization.actor);
  const share = shares.find(s => s.extSymbol.sym.code === market.share_symbol.sym.code)
  if (share && share.amount.isGreaterThan(`0`)) {
    await redeemShare(api)(share, authorization)
  }

  const ownUnderlyingBalance = await fetchBalance(api)(authorization.actor, debtExtAsset.extSymbol);
  console.log(`ownUnderlyingBalance`, formatAsset(extAsset2asset(ownUnderlyingBalance)));

  // cap amount to repay to own balance
  if (adjustedAsset.amount.isGreaterThan(ownUnderlyingBalance.amount)) {
    adjustedAsset.amount = ownUnderlyingBalance.amount;
  }
  console.log(`repaying`, formatAsset(adjustedAsset));
  if (adjustedAsset.amount.isZero()) {
    throw new Error(`Bot does not have any tokens to repay: ${formatAsset(adjustedAsset)}`);
  }

  const actions = [
    {
      account: LENDING_CONTRACT,
      authorization: [authorization],
      name: 'entermarkets',
      data: {
        payer: authorization.actor,
        user: authorization.actor,
        markets: [market.share_symbol.sym.code, seizeSymbol],
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
        memo: `liquidate,${user},${seizeSymbol}`,
      },
    },
  ];
  //console.dir(actions, { depth: null })
  return await sendTransaction(api)(actions);
};
