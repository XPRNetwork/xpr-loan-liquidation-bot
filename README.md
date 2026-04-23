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
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token for liquidation notifications |
| `TELEGRAM_CHAT_ID` | No | Telegram chat ID for liquidation notifications |

3. Optionally edit `testnet.config.js` or `mainnet.config.js` if running with PM2.

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

If `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are configured, completed liquidations are also sent as Telegram messages.

## Scripts

| Command | Description |
|---|---|
| `npm start` | Run in development mode with auto-reload |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run start:prod` | Run the production build |
| `npm run lint` | Type-check with TypeScript |
