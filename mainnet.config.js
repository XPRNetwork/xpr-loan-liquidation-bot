const endpoints = [
  "https://proton.cryptolions.io",
  "https://proton.eosusa.news",
  "https://proton.eoscafeblock.com",
  "https://proton.pink.gg"
]

const accounts = [
  'otctest@active',
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