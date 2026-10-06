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
  LOG_ONLY_MODE,
  MIN_LIQUIDATION_USD,
  PRICE_REFRESH_INTERVAL_MS,
  PRIVATE_KEYS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID
} from "./constants";
import { initPriceCache } from "./price-cache";
import {
  getMinLiquidationThresholdMessage,
  performLiquidation,
  scanLiquidations
} from "./liquidation";
import { appendLog } from "./logger";
import { fetchAllBorrowers } from "./tables";

const rpc = new JsonRpc(ENDPOINTS);
const api = new Api({
  rpc,
  signatureProvider: new JsSignatureProvider(PRIVATE_KEYS as any)
});

if (LOG_ONLY_MODE) {
  console.warn(
    "LOG_ONLY_MODE is enabled. Candidate probes are still signed and sent, but liquidation transactions will not be sent."
  );
}

const wait = async (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

const liquidationKey = (liquidation: Liquidation): string =>
  [
    liquidation.user,
    liquidation.debtExtAsset.extSymbol.contract,
    liquidation.debtExtAsset.extSymbol.sym.code,
    liquidation.seizeSymbol
  ].join(":");

const sendTelegramNotification = (message: string) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const body = new URLSearchParams({
    chat_id: TELEGRAM_CHAT_ID,
    text: message
  });
  void fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    { method: "POST", body }
  ).catch(error => console.warn("Telegram notification failed", error));
};

const processCandidate = (api: Api) => async (
  liquidation: Liquidation,
  authorization: Serialize.Authorization,
  inFlight: Set<string>,
  recentAttempts: Map<string, number>
) => {
  const { user, debtExtAsset, seizeSymbol } = liquidation;
  const key = liquidationKey(liquidation);
  const now = Date.now();
  const recentAttempt = recentAttempts.get(key);

  appendLog(
    "available-liquidations.log",
    `user=${user} debt=${formatAsset(extAsset2asset(debtExtAsset))} seize=${seizeSymbol} bot=${authorization.actor}`
  );
  appendLog(
    "race-metrics.log",
    `event=detected user=${user} debt=${formatAsset(extAsset2asset(debtExtAsset))} seize=${seizeSymbol} bot=${authorization.actor}`
  );

  if (
    inFlight.has(key) ||
    (recentAttempt !== undefined &&
      now - recentAttempt < BOTS_CONFIG.recentAttemptTtlMs)
  ) {
    appendLog(
      "race-metrics.log",
      `event=deduplicated user=${user} key=${key} bot=${authorization.actor}`
    );
    return;
  }

  const thresholdError = getMinLiquidationThresholdMessage(debtExtAsset);
  if (thresholdError) {
    const skipSummary = `user=${user} debt=${formatAsset(
      extAsset2asset(debtExtAsset)
    )} reason=${thresholdError} bot=${authorization.actor}`;
    console.log(`Skipping liquidation: ${skipSummary}`);
    appendLog("skipped-liquidations.log", skipSummary);
    return;
  }

  if (LOG_ONLY_MODE) {
    const dryRunSummary = `user=${user} debt=${formatAsset(
      extAsset2asset(debtExtAsset)
    )} seize=${seizeSymbol} action=would-liquidate bot=${authorization.actor}`;
    console.log(`LOG-ONLY: ${dryRunSummary}`);
    appendLog("log-only-liquidations.log", dryRunSummary);
    return;
  }

  inFlight.add(key);
  recentAttempts.set(key, now);
  appendLog(
    "race-metrics.log",
    `event=submitting user=${user} detected_to_submit_ms=${Date.now() - now} bot=${authorization.actor}`
  );

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
    appendLog(
      "race-metrics.log",
      `event=confirmed user=${user} elapsed_ms=${Date.now() - now} tx=${txResult.transaction_id} bot=${authorization.actor}`
    );
    sendTelegramNotification(liquidationInfo);
  } catch (error) {
    if (error?.message?.includes("below minimum liquidation threshold")) {
      const skipSummary = `user=${user} debt=${formatAsset(
        extAsset2asset(debtExtAsset)
      )} reason=${error.message} bot=${authorization.actor}`;
      console.log(`Skipping liquidation: ${skipSummary}`);
      appendLog("skipped-liquidations.log", skipSummary);
    } else {
      console.error("Error Performing Liquidation");
      console.error(error);
      appendLog(
        "race-metrics.log",
        `event=failed user=${user} elapsed_ms=${Date.now() - now} error=${String(error?.message ?? error).replace(/\s+/g, " ")} bot=${authorization.actor}`
      );
    }
  } finally {
    inFlight.delete(key);
  }
};

const processAccount = async (
  authorization: Serialize.Authorization,
  inFlight: Set<string>,
  recentAttempts: Map<string, number>
) => {
  const cutoff = Date.now() - BOTS_CONFIG.recentAttemptTtlMs;
  for (const [key, attemptedAt] of recentAttempts) {
    if (attemptedAt < cutoff) recentAttempts.delete(key);
  }

  try {
    const borrowers = await fetchAllBorrowers(api);
    const users = borrowers.filter(user => user !== authorization.actor);
    const stats = await scanLiquidations(api)(
      users,
      authorization,
      liquidation =>
        processCandidate(api)(
          liquidation,
          authorization,
          inFlight,
          recentAttempts
        )
    );
    appendLog(
      "race-metrics.log",
      `event=scan-complete borrowers=${stats.borrowerCount} chunks=${stats.chunkCount} candidates=${stats.candidateCount} elapsed_ms=${stats.elapsedMs} rotation=${stats.rotation} concurrency=${BOTS_CONFIG.scanConcurrency} bot=${authorization.actor}`
    );
  } catch (e) {
    console.error("Error in fetching Liquidations");
    console.error(e);
  }
};

const processor = async (authorization: Serialize.Authorization) => {
  const inFlight = new Set<string>();
  const recentAttempts = new Map<string, number>();
  while (true) {
    await processAccount(authorization, inFlight, recentAttempts);
    await wait(BOTS_CONFIG.waitTime);
  }
};

export const main = async () => {
  const priceCache = initPriceCache(
    PRICE_REFRESH_INTERVAL_MS,
    MIN_LIQUIDATION_USD
  );
  await priceCache.refresh();
  priceCache.start();

  for (const account of BOTS_ACCOUNTS) {
    processor(account);
  }
};

void main();
