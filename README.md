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
| `PREFERRED_ENDPOINT` | No | RPC endpoint tried first; use a synchronized local mainnet node when available |
| `ACCOUNTS` | Yes | Comma-separated accounts in `name@permission` format (e.g. `myaccount@active`) |
| `LENDING_CONTRACT` | Yes | Lending contract account (`lending.loan` on mainnet, `lending` on testnet) |
| `LOG_ONLY_MODE` | No | If `true`, bot logs liquidation candidates without sending transactions |
| `MIN_LIQUIDATION_USD` | No | Target USD value for minimum liquidation thresholds (default: `1`) |
| `PRICE_REFRESH_INTERVAL_MS` | No | How often to refresh CoinGecko prices used for minimum liquidation thresholds, in milliseconds (default: `3600000`, i.e. 60 minutes) |
| `SCAN_WAIT_MS` | No | Delay between complete borrower scans (default: `10000`) |
| `SCAN_CHUNK_SIZE` | No | Borrowers checked per `findliq` probe, capped at 50 (default: `50`) |
| `SCAN_CONCURRENCY` | No | Concurrent borrower-chunk probes, capped at 16 (default: `4`) |
| `RECENT_ATTEMPT_TTL_MS` | No | Suppress repeat attempts for the same candidate during this window (default: `30000`) |
| `MARKET_CACHE_TTL_MS` | No | Cache lending market metadata for this duration (default: `300000`) |
| `REDEEM_BEFORE_LIQUIDATION` | No | Redeem held shares in the latency-sensitive path (default: `false`) |
| `ENTER_MARKETS_EACH_LIQUIDATION` | No | Include `entermarkets` before each transfer (default: `true`; disable only after verifying the bot is already entered in every required market) |
| `USE_LAST_IRREVERSIBLE` | No | Build transactions from the last irreversible block rather than the head block (default: `false`) |
| `TX_BLOCKS_BEHIND` | No | Reference this many blocks behind the head when not using the last irreversible block (default: `3`) |
| `TX_EXPIRE_SECONDS` | No | Transaction expiration window (default: `30`) |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token for liquidation notifications |
| `TELEGRAM_CHAT_ID` | No | Telegram chat ID for liquidation notifications |

If `LOG_ONLY_MODE` is omitted, it defaults to `false` and the bot performs real liquidations. Log-only mode still sends signed `findliq` probe transactions, which intentionally assert without changing chain state; it suppresses the actual liquidation transfer.

Minimum liquidation thresholds are derived automatically from CoinGecko prices on startup and refreshed every `PRICE_REFRESH_INTERVAL_MS` (default 3600000, i.e. 60 minutes). Each supported lending token targets the USD value configured by `MIN_LIQUIDATION_USD` (default `1`). Tokens without a configured minimum are liquidated without a minimum threshold.

3. Optionally edit `testnet.config.js` or `mainnet.config.js` if running with PM2.

## Security & Operational Notes

This bot signs live on-chain transactions that move funds. Treat it accordingly:

- **Private keys are high-value secrets.** `PRIVATE_KEYS` are the keys to the bot's account(s). `.env` is git-ignored (do not commit it), but plaintext on disk is still a risk surface. Prefer injecting keys from a secrets manager at runtime over storing them in a plaintext `.env`, restrict file permissions (`chmod 600 .env`), and **rotate any key immediately** if it has been pasted into a log, screenshot, ticket, or chat.
- **Use a dedicated, least-privilege account.** Give the bot its own liquidator account with only the permissions it needs to repay debt and seize/redeem collateral — not a personal or treasury account.
- **The bot needs working capital.** It can only liquidate up to the underlying-token balance it holds (`performLiquidation` caps repayment to the bot's own balance and skips with an error if the balance is zero). Fund the account with the debt assets you intend to repay, and monitor the balance.
- **It runs unattended in an infinite loop** (waiting 10s after each complete scan by default). Run it under PM2 (or an equivalent supervisor) so it restarts on crash, and watch the log files / Telegram notifications for failures.
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
- `logs/race-metrics.log` -- detection, submission, confirmation/failure, deduplication, and scan-latency events

If `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are configured, completed liquidations are also sent as Telegram messages.

## Scripts

| Command | Description |
|---|---|
| `npm start` | Run in development mode with auto-reload |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run start:prod` | Run the production build |
| `npm run lint` | Type-check with TypeScript |
| `npm test` | Run unit tests |
