const endpoints = [
  "https://proton.eoscafeblock.com",
  "https://proton.eosusa.news",
  "https://proton.cryptolions.io",
  "https://proton.pink.gg"
]
const accounts = [
  'bot1@active',
  'bot2@active',
  'bot3@active' ,
  'bot4@active'
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
        }
      }
    ]
};