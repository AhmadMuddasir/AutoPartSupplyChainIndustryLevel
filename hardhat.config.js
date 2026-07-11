require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
const privateKey = process.env.PRIVATE_KEY;
const RPC_URL = process.env.SEPOLIA_RPC_URL;

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {            
      evmVersion: "cancun",
       optimizer: {
        enabled: true,
        runs: 200
      }
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: RPC_URL,
      accounts: [privateKey],
      chainId: 11155111,
    },
  },
};