/**
 * @fileoverview Cross-chain bridging aggregator using Hop's SDK.
 *
 * We retrieve send data (fee breakdown) using Hop's getSendData.
 * For L1→L2 transfers (e.g., Ethereum → Base), bonder fees and destination tx fees are typically zero.
 *
 * We define our own ChainConstants to avoid reliance on the SDK’s Chain export.
 */

const { Hop } = require('@hop-protocol/sdk');

const ChainConstants = {
  Ethereum: "ethereum",
  Base: "base",
};

// Supported tokens for Hop bridging (whitelist based on supported assets; adjust as needed)
const supportedHopTokens = new Set(["WETH", "USDC", "ETH"]);

/**
 * Retrieves bridging send data (fee breakdown) using Hop's SDK.
 *
 * @param {string} tokenSymbol - e.g. "WETH" or "USDC"
 * @param {string} amount - Amount in minimal units (as a string)
 * @param {string} sourceChain - Internal source chain, e.g., "ethereum"
 * @param {string} destChain - Internal destination chain, e.g., "base"
 * @param {string} [network="mainnet"] - The network for Hop (e.g., "mainnet")
 * @return {Promise<Object>} The send data object (with fee breakdown)
 */
async function getHopSendData(tokenSymbol, amount, sourceChain, destChain, network = 'mainnet') {
  try {
    // Pre-validate token support for Hop bridging.
    if (!supportedHopTokens.has(tokenSymbol.toUpperCase())) {
      throw new Error(`Token "${tokenSymbol}" is not supported by Hop's SDK on the current chain.`);
    }
    
    let srcChain, dstChain;
    if (sourceChain.toLowerCase() === 'ethereum') {
      srcChain = ChainConstants.Ethereum;
    } else if (sourceChain.toLowerCase() === 'base') {
      srcChain = ChainConstants.Base;
    } else {
      throw new Error(`Unsupported source chain: ${sourceChain}`);
    }
    if (destChain.toLowerCase() === 'ethereum') {
      dstChain = ChainConstants.Ethereum;
    } else if (destChain.toLowerCase() === 'base') {
      dstChain = ChainConstants.Base;
    } else {
      throw new Error(`Unsupported destination chain: ${destChain}`);
    }
    
    const hop = new Hop(network);
    console.debug(`Fetching Hop send data for token ${tokenSymbol}, amount ${amount}, from ${srcChain} to ${dstChain}`);
    const bridge = hop.bridge(tokenSymbol);
    const sendData = await bridge.getSendData(amount, srcChain, dstChain);
    console.debug(`Received Hop send data: ${JSON.stringify(sendData)}`);
    return sendData;
  } catch (error) {
    console.error(`Error in getHopSendData: ${error.message}`);
    throw error;
  }
}

module.exports = { getHopSendData };
