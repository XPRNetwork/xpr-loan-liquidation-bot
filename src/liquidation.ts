import { Api, Serialize } from "@protonprotocol/protonjs";
import chunkFn from "lodash/chunk";
import { TExtendedAsset, TExtendedAssetEosio } from "./@types/tables";
import { decomposeAsset, formatAsset } from "./asset";
import { LENDING_CONTRACT } from "./constants";
import { sendTransaction } from "./transaction";

export const findLiquidation = (api: Api) => async (
  accounts: string[],
  authorization: Serialize.Authorization
): Promise<{
  user: string;
  debtExtAsset: TExtendedAssetEosio;
  seizeSymbol: string;
} | null> => {
  // call the check-liquidation action which accruess all debt and checks each user
  const chunks = chunkFn(accounts, 100); // TODO: adjust this chunk size if timing out
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
      console.error(`{findLiquidation}: ${error.message}`);
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
      console.log(
        `status: ${status}`,
        user,
        debtAmount,
        debtExtSymbol,
        seizeSymbolCode
      );
      if (status === `found`) {
        // just use the recommendation from the smart contract which returns
        // the highest debt asset + highest collateral asset
        // more sophisticated methods would also check if liquidator has
        // enough balance for this
        const [debtSymbol, debtContract] = debtExtSymbol.split(`@`);
        const debtQuantity = `${debtAmount} ${debtSymbol}`;
        return {
          user,
          debtExtAsset: { quantity: debtQuantity, contract: debtContract },
          seizeSymbol: seizeSymbolCode,
        };
      }
      // otherwise continue the loop for the next chunk
    }
  }
  return null;
};

export const performLiquidation = (api: Api) => async (
  user: string,
  debtExtAsset: TExtendedAssetEosio,
  seizeSymbol: string,
  authorization: Serialize.Authorization
): Promise<void> => {
  // adjust the max debtExtAsset quantity because it's right at the threshold
  const asset = decomposeAsset(debtExtAsset.quantity);
  const adjustedQuantity = formatAsset({
    amount: asset.amount.times(99).div(100),
    symbol: asset.symbol,
  });
  const actions = [
    {
      account: debtExtAsset.contract,
      authorization: [authorization],
      name: "transfer",
      data: {
        from: authorization.actor,
        to: LENDING_CONTRACT,
        quantity: adjustedQuantity,
        memo: `liquidate,${user},${seizeSymbol}`,
      },
    },
  ];
  return await sendTransaction(api)(actions);
};
