import dotenv from "dotenv";
import { Serialize } from "@proton/js";

dotenv.config();

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
  waitTime: 10 * 1000
};

export const BOTS_ACCOUNTS: Serialize.Authorization[] = [];
if (!process.env.ACCOUNTS) {
  console.error("No ACCOUNTS provided");
  process.exit(0);
}
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const parseBooleanEnv = (value: string | undefined): boolean => {
  if (!value) return false;
  return /^(1|true|yes|on)$/i.test(value.trim());
};

export const LOG_ONLY_MODE = parseBooleanEnv(process.env.LOG_ONLY_MODE);

const DEFAULT_PRICE_REFRESH_INTERVAL_MS = 3_600_000;
const parsedPriceRefreshInterval = Number.parseInt(
  process.env.PRICE_REFRESH_INTERVAL_MS ?? "",
  10
);
export const PRICE_REFRESH_INTERVAL_MS =
  Number.isFinite(parsedPriceRefreshInterval) &&
  parsedPriceRefreshInterval > 0
    ? parsedPriceRefreshInterval
    : DEFAULT_PRICE_REFRESH_INTERVAL_MS;

const DEFAULT_MIN_LIQUIDATION_USD = 1;
const parsedMinLiquidationUsd = Number.parseFloat(
  process.env.MIN_LIQUIDATION_USD ?? ""
);
export const MIN_LIQUIDATION_USD =
  Number.isFinite(parsedMinLiquidationUsd) && parsedMinLiquidationUsd > 0
    ? parsedMinLiquidationUsd
    : DEFAULT_MIN_LIQUIDATION_USD;

if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
  console.warn("No TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID provided in .env");
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
