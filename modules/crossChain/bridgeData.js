/**
 * @fileoverview Cross-chain bridging or swap estimation using 1inch aggregator.
 */

const axios = require('axios');
const { getChainConfig } = require('../../config/chainContext');

/**
 * Estimate a cross-chain "bridge" by checking 1inch aggregator on the destination chain.
 * In reality, 1inch might require you to do a swap on source chain + bridging service + swap on destination chain.
 * This is a simplified approach that queries 1inch's swap quote on the destination chain.
 *
 * @param {string} sourceChain 'ethereum' or 'base'
 * @param {string} destChain 'ethereum' or 'base'
 * @param {string} fromTokenAddress The token address on source chain
 * @param {string} toTokenAddress The token address on destination chain
 * @param {string} amount The amount in minimal units (scaled by decimals)
 * @return {Promise<Object>} { estimatedGas, toTokenAmount, ... } from 1inch
 */
async function get1inchBridgeQuote(sourceChain, destChain, fromTokenAddress, toTokenAddress, amount) {
  // In practice, bridging from chain A to chain B may involve:
  // 1) Swapping token on source chain into a canonical bridging token
  // 2) Using a bridging protocol to move funds
  // 3) Swapping into the final token on the destination chain
  // 1inch might only handle steps 1 & 3. The bridging step may be external or partial.

  const destConfig = getChainConfig(destChain);
  if (!destConfig.oneInchApi) {
    throw new Error(`1inch not configured for chain "${destChain}"`);
  }

  // Example endpoint: GET /v5.0/<chainId>/quote
  // But for an actual "bridge," you might need a custom bridging aggregator or multiple calls.
  // We'll do a simplified approach that queries the "quote" endpoint on the destination chain’s aggregator.
  const url = `${destConfig.oneInchApi}/quote`;

  try {
    const response = await axios.get(url, {
      params: {
        fromTokenAddress,
        toTokenAddress,
        amount,
      },
      timeout: 30000,
    });

    return response.data; 
  } catch (error) {
    console.error('Error fetching 1inch bridge quote:', error);
    throw error;
  }
}

module.exports = {
  get1inchBridgeQuote,
};
