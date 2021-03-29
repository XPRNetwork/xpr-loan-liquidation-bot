const endpoints = [
  "https://testnet.protonchain.com",
  "https://testnet.proton.pink.gg"
]
const accounts = [
  'liquidator11@active',
  // 'liquidator12@active',
]

module.exports = {
    apps : [
      {
        name: 'proton-liquidation-testnet-bots',
        script: 'dist/index.js',
        node_args : '-r dotenv/config',
        watch: false,
        env: {
          'CHAIN': 'proton-test',
          'ENDPOINTS': endpoints.join(','),
          'ACCOUNTS': accounts.join(','),
        }
      }
    ]
};