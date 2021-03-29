import {
  Api,
  JsonRpc,
  JsSignatureProvider,
  Serialize,
} from "@protonprotocol/protonjs";
import fetch from "node-fetch";
import {
  ENDPOINTS,
  PRIVATE_KEYS,
  BOTS_ACCOUNTS,
  BOTS_CONFIG,
  LENDING_CONTRACT,
} from "./constants";
import { fetchAllBorrowers } from "./users";

const rpc = new JsonRpc(ENDPOINTS, { fetch: fetch });
const api = new Api({
  rpc,
  signatureProvider: new JsSignatureProvider(PRIVATE_KEYS as any),
});

const wait = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const process = async (authorization: Serialize.Authorization) => {
  const users = await fetchAllBorrowers(api)
  console.log(JSON.stringify(users))
  const actions = [
    {
      account: LENDING_CONTRACT,
      authorization,
      name: "feed",
      data: {},
    },
  ];

  try {
    const result = await api.transact(
      { actions },
      {
        useLastIrreversible: true,
        expireSeconds: 400,
      }
    );
    return result;
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
