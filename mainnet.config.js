const endpoints = [
  "https://proton.eosusa.news",
  "https://proton.cryptolions.io",
  "https://proton.greymass.com",
  "https://proton.eoscafeblock.com"
]

const accounts = [
  'liq@active',
]

module.exports = {
    apps : [
      {
        name: 'proton-liquidation-mainnet-bots',
        script: 'dist/index.js',
        node_args : '-r dotenv/config',
        watch: false,
        env: {
          'CHAIN': 'proton',
          'ENDPOINTS': endpoints.join(','),
          'ACCOUNTS': accounts.join(','),
          "LENDING_CONTRACT": 'lending.loan'
        }
      }
    ]
};