import BigNumber from "bignumber.js";
import { TExtendedAsset } from "./@types/tables";
import { formatAsset } from "./asset";

export type TMinLiquidationAmounts = Record<string, BigNumber>;

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
