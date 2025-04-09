/**
 * @fileoverview Creates robust Ethers.js providers with fallback.
 */
const { ethers } = require('ethers');
const { getChainConfig } = require('./chainContext');

function getProvider(chainName) {
  const { rpcUrl } = getChainConfig(chainName);

  const httpProvider = new ethers.providers.StaticJsonRpcProvider({
    url: rpcUrl,
    timeout: 30000,
  });

  let wsProvider;
  if (chainName === 'ethereum' && process.env.WS_ETHEREUM_RPC_URL) {
    wsProvider = new ethers.providers.WebSocketProvider(process.env.WS_ETHEREUM_RPC_URL);
  } else if (chainName === 'base' && process.env.WS_BASE_RPC_URL) {
    wsProvider = new ethers.providers.WebSocketProvider(process.env.WS_BASE_RPC_URL);
  }

  if (wsProvider) {
    return new ethers.providers.FallbackProvider([
      { provider: httpProvider, priority: 1 },
      { provider: wsProvider, priority: 2 },
    ]);
  }
  return httpProvider;
}

module.exports = { getProvider };
