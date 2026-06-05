import BigNumber from "bignumber.js";
import { TExtendedAsset } from "./@types/tables";
import { formatAsset } from "./asset";

// Amounts are human-readable token units (not precision-scaled uint64 values).
// Defaults target roughly ~$1 minimum liquidation size per token.
export const DEFAULT_MIN_LIQUIDATION_AMOUNTS: Record<string, string> = {
  XADA: "6.2692",
  XBTC: "0.00001646",
  XDOGE: "12.268",
  XETH: "0.00063242",
  XHBAR: "12.6338",
  XLTC: "0.02311071",
  XMD: "1",
  XMT: "4.1621",
  XPR: "481",
  XSOL: "0.01549187",
  XUSDC: "1",
  XUSDT: "1",
  XXLM: "5.3227",
  XXRP: "0.90909091"
};

export type TMinLiquidationAmounts = Record<string, BigNumber>;

export const parseMinLiquidationAmounts = (
  raw: string | undefined,
  defaults: Record<string, string> = DEFAULT_MIN_LIQUIDATION_AMOUNTS,
  warn: (message: string) => void = console.warn
): TMinLiquidationAmounts => {
  const parsed: TMinLiquidationAmounts = {};

  for (const [symbol, amount] of Object.entries(defaults)) {
    parsed[symbol] = new BigNumber(amount);
  }

  if (!raw || !raw.trim()) {
    return parsed;
  }

  for (const entry of raw.split(",")) {
    const [symbolRaw, amountRaw] = entry.split(":");
    const symbol = (symbolRaw || "").trim().toUpperCase();
    const amount = (amountRaw || "").trim();
    if (!symbol || !amount) {
      warn(`Skipping invalid MIN_LIQUIDATION_AMOUNTS entry: ${entry}`);
      continue;
    }

    const parsedAmount = new BigNumber(amount);
    if (!parsedAmount.isFinite() || parsedAmount.isNegative()) {
      warn(`Skipping invalid MIN_LIQUIDATION_AMOUNTS amount: ${entry}`);
      continue;
    }

    parsed[symbol] = parsedAmount;
  }

  return parsed;
};

export const getMinimumLiquidationAmount = (
  debtExtAsset: TExtendedAsset,
  minLiquidationAmounts: TMinLiquidationAmounts
): BigNumber | undefined => {
  const symbolCode = debtExtAsset.extSymbol.sym.code.toUpperCase();
  const configuredMinimum = minLiquidationAmounts[symbolCode];
  if (!configuredMinimum) {
    return undefined;
  }

  return configuredMinimum
    .times(new BigNumber(10).pow(debtExtAsset.extSymbol.sym.precision))
    .integerValue(BigNumber.ROUND_CEIL);
};

export const getMinLiquidationThresholdMessage = (
  debtExtAsset: TExtendedAsset,
  minLiquidationAmounts: TMinLiquidationAmounts
): string | undefined => {
  const minimumAmount = getMinimumLiquidationAmount(
    debtExtAsset,
    minLiquidationAmounts
  );
  if (!minimumAmount) {
    return undefined;
  }

  if (debtExtAsset.amount.isLessThan(minimumAmount)) {
    return `below minimum liquidation threshold ${formatAsset({
      amount: minimumAmount,
      symbol: debtExtAsset.extSymbol.sym
    })}`;
  }

  return undefined;
};