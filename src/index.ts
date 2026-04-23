import {
  Api,
  JsonRpc,
  JsSignatureProvider,
  Serialize
} from "@proton/js";
import { Liquidation } from "./@types/tables";
import { formatAsset, extAsset2asset } from "./asset";
import {
  BOTS_ACCOUNTS,
  BOTS_CONFIG,
  ENDPOINTS,
  PRIVATE_KEYS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID
} from "./constants";
import { findLiquidations, performLiquidation } from "./liquidation";
import { appendLog } from "./logger";
import { fetchAllBorrowers } from "./tables";

const rpc = new JsonRpc(ENDPOINTS);
const api = new Api({
  rpc,
  signatureProvider: new JsSignatureProvider(PRIVATE_KEYS as any)
});

const wait = async (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

const process = async (authorization: Serialize.Authorization) => {
  let liquidations: Liquidation[] = [];

  try {
    const borrowers = await fetchAllBorrowers(api);
    const users = borrowers.filter(user => user !== authorization.actor);

    liquidations = await findLiquidations(api)(users, authorization);

    for (const liq of liquidations) {
      appendLog(
        "available-liquidations.log",
        `user=${liq.user} debt=${formatAsset(extAsset2asset(liq.debtExtAsset))} seize=${liq.seizeSymbol} bot=${authorization.actor}`
      );
    }
  } catch (e) {
    console.error("Error in fetching Liquidations");
    console.error(e);
  }

  for (const liquidation of liquidations) {
    const { user, debtExtAsset, seizeSymbol } = liquidation;
    console.log(`Liquidation in progress`);
    
    try {
      const txResult = await performLiquidation(api)(
        user,
        debtExtAsset,
        seizeSymbol,
        authorization
      );
      const liquidationInfo = `Liquidated ${user} for ${seizeSymbol} (using ~${formatAsset(
        extAsset2asset(debtExtAsset)
      )})`;
      console.log(liquidationInfo, txResult.transaction_id);

      appendLog(
        "completed-liquidations.log",
        `user=${user} debt=${formatAsset(extAsset2asset(debtExtAsset))} seize=${seizeSymbol} tx=${txResult.transaction_id} bot=${authorization.actor}`
      );

      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const response = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${liquidationInfo}`
        );
        const body = await response.json();
      }

      // const result = await sendTransaction(api)(actions);
      // return result;
    } catch (e) {
      console.error("Error Performing Liquidation");
      console.error(e);
    }
  }
};

const processor = async (authorization: Serialize.Authorization) => {
  await process(authorization);
  await wait(BOTS_CONFIG.waitTime);
  processor(authorization);
};

export const main = () => {
  for (const account of BOTS_ACCOUNTS) {
    processor(account);
  }
};

main();
