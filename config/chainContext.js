/**
 * @fileoverview Manages chain configurations for multi-chain data pulling.
 */
require('dotenv').config();

const chainConfigs = {
  ethereum: {
    chainId: 1,
    rpcUrl: process.env.ETHEREUM_RPC_URL,
    lifiChainId: 1, // Li.Fi's chain id for Ethereum
  },
  base: {
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL,
    lifiChainId: 8453, // Li.Fi's chain id for Base (verify with Li.Fi docs)
  },
  // Future extensions: solana, unichain, etc.
};

function getChainConfig(chainName) {
  const config = chainConfigs[chainName];
  if (!config) {
    throw new Error(`Chain config not found for "${chainName}"`);
  }
  return config;
}

module.exports = { getChainConfig };
