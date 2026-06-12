import { describe, it } from "node:test";
import assert from "node:assert/strict";
import BigNumber from "bignumber.js";
import {
  getMinLiquidationThresholdMessage,
  getMinimumLiquidationAmount
} from "./min-liquidation";
import {
  buildMinLiquidationAmounts,
  toMinAmount
} from "./price-cache";
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

describe("toMinAmount", () => {
  it("rounds large amounts up to whole units", () => {
    assert.equal(toMinAmount(0.002), "500");
  });

  it("rounds medium amounts up to four decimal places", () => {
    assert.equal(toMinAmount(2.5), "0.4");
  });

  it("rounds small amounts up to eight decimal places", () => {
    assert.equal(toMinAmount(60000), "0.00001667");
  });

  it("scales the target USD minimum", () => {
    assert.equal(toMinAmount(2, 5), "2.5");
  });
});

describe("buildMinLiquidationAmounts", () => {
  it("derives minimums from CoinGecko prices for all tokens", () => {
    const amounts = buildMinLiquidationAmounts({
      ripple: { usd: 2 },
      "usd-coin": { usd: 0.9998 },
      bitcoin: { usd: 60000 },
      stellar: { usd: 0.5 },
      proton: { usd: 0.002 },
      "hedera-hashgraph": { usd: 0.08 },
      "metal-dollar": { usd: 1.0001 },
      metal: { usd: 0.24 },
      ethereum: { usd: 3000 },
      dogecoin: { usd: 0.08 },
      solana: { usd: 150 },
      litecoin: { usd: 80 },
      cardano: { usd: 0.16 },
      tether: { usd: 0.9999 }
    });

    assert.equal(amounts.XUSDC.toString(), "1.0003");
    assert.equal(amounts.XUSDT.toString(), "1.0002");
    assert.equal(amounts.XMD.toString(), "0.99990001");
    assert.equal(amounts.XXRP.toString(), "0.5");
    assert.equal(amounts.XBTC.toString(), "0.00001667");
    assert.equal(amounts.XPR.toString(), "500");
  });

  it("scales minimums by the target USD value", () => {
    const amounts = buildMinLiquidationAmounts(
      {
        ripple: { usd: 2 },
        "usd-coin": { usd: 0.9998 },
        bitcoin: { usd: 60000 },
        stellar: { usd: 0.5 },
        proton: { usd: 0.002 },
        "hedera-hashgraph": { usd: 0.08 },
        "metal-dollar": { usd: 1.0001 },
        metal: { usd: 0.24 },
        ethereum: { usd: 3000 },
        dogecoin: { usd: 0.08 },
        solana: { usd: 150 },
        litecoin: { usd: 80 },
        cardano: { usd: 0.16 },
        tether: { usd: 0.9999 }
      },
      5
    );

    assert.equal(amounts.XXRP.toString(), "2.5");
    assert.equal(amounts.XPR.toString(), "2500");
  });

  it("throws when a required price is missing", () => {
    assert.throws(
      () =>
        buildMinLiquidationAmounts({
          ripple: { usd: 2 }
        }),
      /Missing\/invalid price for XUSDC/
    );
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
