import { describe, it } from "node:test";
import assert from "node:assert/strict";
import BigNumber from "bignumber.js";
import {
  getMinLiquidationThresholdMessage,
  getMinimumLiquidationAmount,
  parseMinLiquidationAmounts
} from "./min-liquidation";
import { TExtendedAsset } from "./@types/tables";

const makeExtAsset = (
  amount: string,
  symbolCode: string,
  precision: number = 4
): TExtendedAsset => ({
  amount: new BigNumber(amount),
  extSymbol: {
    sym: {
      code: symbolCode,
      precision
    },
    contract: "token.contract"
  }
});

describe("parseMinLiquidationAmounts", () => {
  it("uses defaults and applies case-insensitive overrides", () => {
    const parsed = parseMinLiquidationAmounts("xpr:12,XBTC:0.00002");

    assert.equal(parsed.XPR.toString(), "12");
    assert.equal(parsed.XBTC.toString(), "0.00002");
    assert.equal(parsed.XUSDC.toString(), "1");
  });

  it("skips malformed and negative entries", () => {
    const warnings: string[] = [];
    const parsed = parseMinLiquidationAmounts(
      "XPR:,ETH:-1,GOOD:2",
      {},
      msg => warnings.push(msg)
    );

    assert.equal(parsed.GOOD.toString(), "2");
    assert.equal(parsed.XPR, undefined);
    assert.equal(parsed.ETH, undefined);
    assert.equal(warnings.length, 2);
  });
});

describe("minimum liquidation threshold", () => {
  it("scales configured minimum by token precision", () => {
    const extAsset = makeExtAsset("0", "XBTC", 8);
    const minimum = getMinimumLiquidationAmount(extAsset, {
      XBTC: new BigNumber("0.00001")
    });

    assert.equal(minimum?.toString(), "1000");
  });

  it("returns skip message when below configured threshold", () => {
    const extAsset = makeExtAsset("99999", "XPR", 4);
    const message = getMinLiquidationThresholdMessage(extAsset, {
      XPR: new BigNumber("10")
    });

    assert.equal(message, "below minimum liquidation threshold 10.0000 XPR");
  });

  it("allows liquidation for unconfigured symbols", () => {
    const extAsset = makeExtAsset("100", "ABC", 4);
    const message = getMinLiquidationThresholdMessage(extAsset, {});

    assert.equal(message, undefined);
  });

  it("allows liquidation when amount is at or above threshold", () => {
    const extAsset = makeExtAsset("100000", "XPR", 4);
    const message = getMinLiquidationThresholdMessage(extAsset, {
      XPR: new BigNumber("10")
    });

    assert.equal(message, undefined);
  });
});