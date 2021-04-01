# Proton Liquidation Server

Liquidates under-collateralized users of Proton's lending protocol.

1. Install npm and nodejs:

```sh
curl -Ls install-node.now.sh | sh
```

2. Install PM2

```sh
npm i -g pm2
```

3. Install (in server folder)

```sh
npm i && npm run build
```

4. Rename .example.env to .env and set private key
5. Edit testnet.config.js and mainnet.config.js with your accounts and endpoints
6. Run liquidation bot

```sh
# Testnet
pm2 start testnet.config.js

# Mainnet
pm2 start mainnet.config.js
```