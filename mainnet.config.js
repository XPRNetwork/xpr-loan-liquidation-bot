const endpoints = [
  "http://127.0.0.1:8889",
  "https://rpc.api.mainnet.metalx.com",
  "https://proton.eosusa.io",
]

const accounts = [
  'loanreaper@active',
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
          'PREFERRED_ENDPOINT': process.env.PREFERRED_ENDPOINT || endpoints[0],
          'ACCOUNTS': accounts.join(','),
          "LENDING_CONTRACT": 'lending.loan',
          'SCAN_CONCURRENCY': process.env.SCAN_CONCURRENCY || '4',
          'SCAN_WAIT_MS': process.env.SCAN_WAIT_MS || '1000',
          'REDEEM_BEFORE_LIQUIDATION': 'false',
          'ENTER_MARKETS_EACH_LIQUIDATION': 'true',
          'USE_LAST_IRREVERSIBLE': 'false',
          'TX_BLOCKS_BEHIND': '3',
          'TX_EXPIRE_SECONDS': '30'
        }
      }
    ]
};
