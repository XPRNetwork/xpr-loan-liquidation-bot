const endpoints = [
  "https://proton.eoscafeblock.com",
  "https://proton.eosusa.io",
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