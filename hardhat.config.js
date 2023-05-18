    //require("@nomiclabs/hardhat-ethers");
    require("@nomiclabs/hardhat-waffle");
    //require("hardhat-gas-reporter");
    //require("solidity-coverage");
    require('dotenv').config();

    const PRIVATE_KEY = process.env.PRIVATE_KEY;

    module.exports = {
        solidity: "0.8.18",
        networks: {
          hardhat: {
           forking: {
             url: `https://polygon-testnet.public.blastapi.io`,
             //blockNumber: 35177545 
           }
          },
          mainnet: {
            url: `https://eth.llamarpc.com`,
              accounts: [`${PRIVATE_KEY}`]
          },
          fuji: {
            url: `https://api.avax-test.network/ext/bc/C/rpc`,
              accounts: [`${PRIVATE_KEY}`]
          }
        }
    };