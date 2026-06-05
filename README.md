# Metal X Lending Liquidation Bot

Liquidates under-collateralized users of the XPR Network lending protocol.

## Prerequisites

- **Node.js >= 22** (install via [nvm](https://github.com/nvm-sh/nvm) or [nodejs.org](https://nodejs.org))

## Setup

1. Install dependencies and build:

```sh
npm install && npm run build
```

2. Copy `.example.env` to `.env` and configure:

```sh
cp .example.env .env
```

Edit `.env` with your values:

| Variable | Required | Description |
|---|---|---|
| `PRIVATE_KEYS` | Yes | Comma-separated private keys for signing transactions |
| `CHAIN` | Yes | Chain identifier (`proton` for mainnet, `proton-test` for testnet) |
| `ENDPOINTS` | Yes | Comma-separated RPC endpoints |
| `ACCOUNTS` | Yes | Comma-separated accounts in `name@permission` format (e.g. `myaccount@active`) |
| `LENDING_CONTRACT` | Yes | Lending contract account (`lending.loan` on mainnet, `lending` on testnet) |
| `LOG_ONLY_MODE` | No | If `true`, bot logs liquidation candidates without sending transactions |
| `MIN_LIQUIDATION_AMOUNTS` | No | Comma-separated per-token minimum liquidation amounts in token units (see `.example.env` for full list; e.g. `XPR:481,XBTC:0.00001646,XUSDC:1`) |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token for liquidation notifications |
| `TELEGRAM_CHAT_ID` | No | Telegram chat ID for liquidation notifications |

If `LOG_ONLY_MODE` is omitted, it defaults to `false` and the bot performs real liquidations.

If `MIN_LIQUIDATION_AMOUNTS` is omitted, built-in defaults are used for all currently supported Metal X lending markets (e.g. `XPR:481`, `XBTC:0.00001646`, `XUSDC:1`) targeting roughly ~$1 liquidation minimums, with stablecoins pinned to `1`. Tokens without a configured minimum are liquidated without a minimum threshold.

To refresh these values from CoinGecko, run `./scripts/update-min-liquidation-amounts.sh` (or `./scripts/update-min-liquidation-amounts.sh --write` to update `.example.env` and `.env`).

3. Optionally edit `testnet.config.js` or `mainnet.config.js` if running with PM2.

## Security & Operational Notes

This bot signs live on-chain transactions that move funds. Treat it accordingly:

- **Private keys are high-value secrets.** `PRIVATE_KEYS` are the keys to the bot's account(s). `.env` is git-ignored (do not commit it), but plaintext on disk is still a risk surface. Prefer injecting keys from a secrets manager at runtime over storing them in a plaintext `.env`, restrict file permissions (`chmod 600 .env`), and **rotate any key immediately** if it has been pasted into a log, screenshot, ticket, or chat.
- **Use a dedicated, least-privilege account.** Give the bot its own liquidator account with only the permissions it needs to repay debt and seize/redeem collateral — not a personal or treasury account.
- **The bot needs working capital.** It can only liquidate up to the underlying-token balance it holds (`performLiquidation` caps repayment to the bot's own balance and skips with an error if the balance is zero). Fund the account with the debt assets you intend to repay, and monitor the balance.
- **It runs unattended in an infinite loop** (polling every ~10s, see `BOTS_CONFIG.waitTime`). Run it under PM2 (or an equivalent supervisor) so it restarts on crash, and watch the log files / Telegram notifications for failures.
- **Endpoints are trusted.** Liquidation opportunities and balances are read from the configured `ENDPOINTS`. Use RPC endpoints you trust and list more than one for redundancy.

## Running

### Development (auto-restarts on file changes)

```sh
npm start
```

### Production (direct)

```sh
node -r dotenv/config dist/index.js
```

### Production (PM2)

```sh
npm i -g pm2

# Testnet
pm2 start testnet.config.js

# Mainnet
pm2 start mainnet.config.js
```

## Logs

The bot writes timestamped entries to files in the `logs/` directory:

- `logs/available-liquidations.log` -- discovered liquidation opportunities
- `logs/completed-liquidations.log` -- successfully executed liquidations
- `logs/log-only-liquidations.log` -- liquidation candidates that would be executed when `LOG_ONLY_MODE=true`
- `logs/findliq-errors.log` -- borrowers whose on-chain `findliq` probe failed (isolated via chunk bisection so a single bad account can't stall the bot)
- `logs/skipped-liquidations.log` -- liquidation candidates skipped because they are below per-token minimum thresholds

If `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are configured, completed liquidations are also sent as Telegram messages.

## Scripts

| Command | Description |
|---|---|
| `npm start` | Run in development mode with auto-reload |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run start:prod` | Run the production build |
| `npm run lint` | Type-check with TypeScript |
| `npm test` | Run unit tests |
