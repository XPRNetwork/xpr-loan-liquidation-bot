#!/usr/bin/env bash
set -euo pipefail

# Recomputes MIN_LIQUIDATION_AMOUNTS to about $1/token using CoinGecko prices.
# Uses a hard-coded list of supported lending symbols and CoinGecko IDs.
#
# Usage:
#   ./scripts/update-min-liquidation-amounts.sh
#   ./scripts/update-min-liquidation-amounts.sh --write
#
# --write updates .example.env and .env (if present).

WRITE=false
if [[ "${1:-}" == "--write" ]]; then
  WRITE=true
fi

MIN_LINE="$(node <<'NODE'
const MARKET_IDS = {
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

const STABLECOINS_FIXED_TO_ONE = new Set(["XMD", "XUSDC", "XUSDT"]);

const orderedSymbols = Object.keys(MARKET_IDS);
const orderedIds = orderedSymbols.map(symbol => MARKET_IDS[symbol]);
const url = `https://api.coingecko.com/api/v3/simple/price?ids=${orderedIds.join(",")}&vs_currencies=usd`;

const toMinAmount = (price) => {
  const amount = 1 / price;
  if (amount >= 100) {
    return String(Math.ceil(amount));
  }
  if (amount >= 1) {
    return (Math.ceil(amount * 10000) / 10000).toFixed(4).replace(/0+$/g, "").replace(/\.$/g, "");
  }
  return (Math.ceil(amount * 1e8) / 1e8).toFixed(8).replace(/0+$/g, "").replace(/\.$/g, "");
};

(async () => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinGecko request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const parts = [];

  for (const symbol of orderedSymbols) {
    if (STABLECOINS_FIXED_TO_ONE.has(symbol)) {
      parts.push(`${symbol}:1`);
      continue;
    }

    const id = MARKET_IDS[symbol];
    const price = data[id]?.usd;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      throw new Error(`Missing/invalid price for ${symbol} (${id})`);
    }
    parts.push(`${symbol}:${toMinAmount(price)}`);
  }

  process.stdout.write(`MIN_LIQUIDATION_AMOUNTS=${parts.join(",")}`);
})().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
NODE
)"

echo "$MIN_LINE"

if [[ "$WRITE" == "true" ]]; then
  for file in .example.env .env; do
    if [[ -f "$file" ]]; then
      if grep -q '^MIN_LIQUIDATION_AMOUNTS=' "$file"; then
        sed -i.bak "s|^MIN_LIQUIDATION_AMOUNTS=.*|$MIN_LINE|" "$file"
      else
        printf "\n%s\n" "$MIN_LINE" >> "$file"
      fi
      rm -f "$file.bak"
      echo "Updated $file"
    fi
  done
fi
