import dotenv from "dotenv";
import { Serialize } from "@proton/js";

dotenv.config();

const parseBooleanEnv = (
  value: string | undefined,
  defaultValue = false
): boolean => {
  if (!value) return defaultValue;
  return /^(1|true|yes|on)$/i.test(value.trim());
};

const parsePositiveIntegerEnv = (
  value: string | undefined,
  defaultValue: number
): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

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
export const ENDPOINTS = Array.from(
  new Set(
    [process.env.PREFERRED_ENDPOINT, ...process.env.ENDPOINTS.split(",")]
      .filter((endpoint): endpoint is string => Boolean(endpoint?.trim()))
      .map(endpoint => endpoint.trim())
  )
);

export const LENDING_CONTRACT = process.env.LENDING_CONTRACT || "lending";
export const BOTS_CONFIG = {
  waitTime: parsePositiveIntegerEnv(process.env.SCAN_WAIT_MS, 10_000),
  chunkSize: Math.min(
    parsePositiveIntegerEnv(process.env.SCAN_CHUNK_SIZE, 50),
    50
  ),
  scanConcurrency: Math.min(
    parsePositiveIntegerEnv(process.env.SCAN_CONCURRENCY, 4),
    16
  ),
  recentAttemptTtlMs: parsePositiveIntegerEnv(
    process.env.RECENT_ATTEMPT_TTL_MS,
    30_000
  ),
  marketCacheTtlMs: parsePositiveIntegerEnv(
    process.env.MARKET_CACHE_TTL_MS,
    300_000
  ),
  redeemBeforeLiquidation: parseBooleanEnv(
    process.env.REDEEM_BEFORE_LIQUIDATION,
    false
  ),
  enterMarketsEachLiquidation: parseBooleanEnv(
    process.env.ENTER_MARKETS_EACH_LIQUIDATION,
    true
  )
};
export const TRANSACTION_CONFIG = {
  useLastIrreversible: parseBooleanEnv(
    process.env.USE_LAST_IRREVERSIBLE,
    false
  ),
  blocksBehind: parsePositiveIntegerEnv(process.env.TX_BLOCKS_BEHIND, 3),
  expireSeconds: parsePositiveIntegerEnv(process.env.TX_EXPIRE_SECONDS, 30)
};

export const BOTS_ACCOUNTS: Serialize.Authorization[] = [];
if (!process.env.ACCOUNTS) {
  console.error("No ACCOUNTS provided");
  process.exit(0);
}
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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
