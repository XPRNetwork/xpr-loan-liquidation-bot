import BigNumber from "bignumber.js";
import { TMinLiquidationAmounts } from "./min-liquidation";

export const MARKET_IDS: Record<string, string> = {
  XXRP: "ripple",
  XUSDC: "usd-coin",
  XBTC: "bitcoin",
  XXLM: "stellar",
  XPR: "proton",
  XHBAR: "hedera-hashgraph",
  XMD: "metal-dollar",
  XMT: "metal",
  XETH: "ethereum",
  XDOGE: "dogecoin",
  XSOL: "solana",
  XLTC: "litecoin",
  XADA: "cardano",
  XUSDT: "tether"
};

const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price";

// Converts token USD price into the minimum token amount for minLiquidationUsd.
// Always rounds up so the threshold is never below the target USD value.
// >=100 units: whole numbers; >=1 unit: 4 decimals; <1 unit: 8 decimals.
export const toMinAmount = (
  price: number,
  minLiquidationUsd: number = 1
): string => {
  const amount = minLiquidationUsd / price;
  if (amount >= 100) {
    return String(Math.ceil(amount));
  }
  if (amount >= 1) {
    return (Math.ceil(amount * 10000) / 10000)
      .toFixed(4)
      .replace(/0+$/g, "")
      .replace(/\.$/g, "");
  }
  return (Math.ceil(amount * 1e8) / 1e8)
    .toFixed(8)
    .replace(/0+$/g, "")
    .replace(/\.$/g, "");
};

export const buildMinLiquidationAmounts = (
  pricesByCoinGeckoId: Record<string, { usd?: number }>,
  minLiquidationUsd: number = 1
): TMinLiquidationAmounts => {
  const amounts: TMinLiquidationAmounts = {};

  for (const [symbol, coinGeckoId] of Object.entries(MARKET_IDS)) {
    const price = pricesByCoinGeckoId[coinGeckoId]?.usd;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      throw new Error(`Missing/invalid price for ${symbol} (${coinGeckoId})`);
    }

    amounts[symbol] = new BigNumber(toMinAmount(price, minLiquidationUsd));
  }

  return amounts;
};

export const fetchCoinGeckoPrices = async (
  minLiquidationUsd: number
): Promise<TMinLiquidationAmounts> => {
  const orderedIds = Object.values(MARKET_IDS);
  const url = `${COINGECKO_URL}?ids=${orderedIds.join(",")}&vs_currencies=usd`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `CoinGecko request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as Record<string, { usd?: number }>;
  return buildMinLiquidationAmounts(data, minLiquidationUsd);
};

const formatAmountsForLog = (amounts: TMinLiquidationAmounts): string =>
  Object.entries(amounts)
    .map(([symbol, amount]) => `${symbol}:${amount.toString()}`)
    .join(",");

export class PriceCache {
  private amounts: TMinLiquidationAmounts = {};
  private intervalId?: NodeJS.Timeout;
  private refreshPromise?: Promise<void>;

  constructor(
    private readonly refreshIntervalMs: number,
    private readonly minLiquidationUsd: number
  ) {}

  getMinLiquidationAmounts(): TMinLiquidationAmounts {
    return this.amounts;
  }

  async refresh(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh().finally(() => {
      this.refreshPromise = undefined;
    });

    return this.refreshPromise;
  }

  private async doRefresh(): Promise<void> {
    try {
      const amounts = await fetchCoinGeckoPrices(this.minLiquidationUsd);
      this.amounts = amounts;
      console.log(
        `Refreshed minimum liquidation amounts from CoinGecko (target $${this.minLiquidationUsd}): ${formatAmountsForLog(amounts)}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (Object.keys(this.amounts).length === 0) {
        console.error(
          `Failed to fetch CoinGecko prices (no cached amounts yet): ${message}`
        );
      } else {
        console.warn(
          `Failed to refresh CoinGecko prices, using cached amounts: ${message}`
        );
      }
    }
  }

  start(): void {
    this.intervalId = setInterval(
      () => void this.refresh(),
      this.refreshIntervalMs
    );
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

let priceCache: PriceCache | undefined;

export const initPriceCache = (
  refreshIntervalMs: number,
  minLiquidationUsd: number
): PriceCache => {
  priceCache = new PriceCache(refreshIntervalMs, minLiquidationUsd);
  return priceCache;
};

export const getPriceCache = (): PriceCache => {
  if (!priceCache) {
    throw new Error("Price cache has not been initialized");
  }
  return priceCache;
};

export const getMinLiquidationAmounts = (): TMinLiquidationAmounts =>
  getPriceCache().getMinLiquidationAmounts();
