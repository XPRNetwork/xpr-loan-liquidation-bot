import {
  Api,
  JsonRpc,
  JsSignatureProvider,
  Serialize
} from "@protonprotocol/protonjs";
import fetch from "node-fetch";
import {
  BOTS_ACCOUNTS,
  BOTS_CONFIG,
  ENDPOINTS,

  PRIVATE_KEYS
} from "./constants";
import {
  findLiquidation,
  performLiquidation
} from "./liquidation";
import { fetchAllBorrowers } from "./users";

const rpc = new JsonRpc(ENDPOINTS, { fetch: fetch });
const api = new Api({
  rpc,
  signatureProvider: new JsSignatureProvider(PRIVATE_KEYS as any),
});

const wait = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const process = async (authorization: Serialize.Authorization) => {
  try {
    const users = await fetchAllBorrowers(api);
    console.log(JSON.stringify(users));
    const result = await findLiquidation(api)(users, authorization);
    if (!result) return;

    const { user, debtExtAsset, seizeSymbol } = result;
    await performLiquidation(api)(
      user,
      debtExtAsset,
      seizeSymbol,
      authorization
    );
    console.log(`Liquidated ${user} for ${seizeSymbol} (using ~${debtExtAsset.quantity})`)

    // const result = await sendTransaction(api)(actions);
    // return result;
  } catch (err) {
    console.error(err);
  }
};

const processor = async (authorization: Serialize.Authorization) => {
  process(authorization);
  await wait(BOTS_CONFIG.waitTime);
  processor(authorization);
};

export const main = () => {
  for (const account of BOTS_ACCOUNTS) {
    processor(account);
  }
};

main();
