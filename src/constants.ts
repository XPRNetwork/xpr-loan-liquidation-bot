import dotenv from 'dotenv'
import { Serialize } from "@protonprotocol/protonjs";

dotenv.config()

if (!process.env.CHAIN) {
  console.error("No CHAIN provided in *.config.js");
  process.exit(0);
}

if (!process.env.PRIVATE_KEYS) {
  console.error("No PRIVATE_KEYS provided in .env");
  process.exit(0);
}
if (!process.env.ENDPOINTS) {
  console.error("No ENDPOINTS provided in *.config.js");
  process.exit(0);
}
export const CHAIN = process.env.CHAIN;
export const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split(",");
export const ENDPOINTS = process.env.ENDPOINTS.split(",");

export const LENDING_CONTRACT = process.env.LENDING_CONTRACT || "lending";
export const BOTS_CONFIG = {
  waitTime: 30 * 1000,
};

export const BOTS_ACCOUNTS: Serialize.Authorization[] = [];
if (!process.env.ACCOUNTS) {
  console.error("No ACCOUNTS provided");
  process.exit(0);
}
for (const accountPermission of process.env.ACCOUNTS.split(",")) {
  let [actor, permission] = accountPermission.split("@");
  if (!actor) {
    console.error("No actor provided");
    process.exit(0);
  }
  if (!permission) {
    permission = "active";
  }
  BOTS_ACCOUNTS.push({ actor, permission });
}
console.log(BOTS_ACCOUNTS);
