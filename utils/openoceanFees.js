// utils/openoceanFees.js
const axios = require('axios');
const ethers = require('ethers');

// Mapping of common EVM chains to OpenOcean chain codes
const chainMapping = {
  ethereum: "eth",   // Ethereum: chain code "eth" (chain id 1)
  bsc: "bsc",        // BNB Chain: chain code "bsc" (chain id 56)
  zksync: "zksync",  // zkSync Era: chain code "zksync" (chain id 324)
  polygon: "polygon",// Polygon: chain code "polygon" (chain id 137)
  base: "base",      // Base: chain code "base" (chain id 8453)
  linea: "linea",    // Linea: chain code "linea" (chain id 59144)
  fantom: "fantom",  // Fantom: chain code "fantom" (chain id 250)
  avax: "avax",      // Avalanche C-Chain: chain code "avax" (chain id 43114)
  arbitrum: "arbitrum",  // Arbitrum One: chain code "arbitrum" (chain id 42161)
  optimism: "optimism"   // Optimism: chain code "optimism" (chain id 10)
};

/**
 * Convert a chain name to the proper API parameter as expected by OpenOcean.
 * @param {string} chain - The chain name (e.g., "ethereum", "bsc", "base", etc.)
 * @returns {string} - The chain parameter for the API call.
 */
function getChainParam(chain) {
  return chainMapping[chain.toLowerCase()] || chain.toLowerCase();
}

/**
 * Check if a token is supported on a given chain by OpenOcean.
 * @param {string} chain - The chain name (e.g., "ethereum", "base")
 * @param {string} tokenAddress - The token contract address.
 * @returns {boolean} - True if supported, false otherwise.
 */
async function isTokenSupported(chain, tokenAddress) {
  try {
    const chainParam = getChainParam(chain);
    const url = `https://open-api.openocean.finance/v4/${chainParam}/tokenList`;
    const response = await axios.get(url);
    if (response.data.code === 200 && Array.isArray(response.data.data)) {
      return response.data.data.some(token =>
        token.address.toLowerCase() === tokenAddress.toLowerCase()
      );
    }
    return false;
  } catch (error) {
    console.error(`Error fetching token list for ${chain}:`, error.message);
    return false;
  }
}

/**
 * Calculate fee data using the OpenOcean V4 Quote API.
 *
 * The API expects the "amount" parameter as a human‑readable string (e.g. "1.23"),
 * and returns outAmount in minimal units. We convert our human‑readable amount into
 * minimal units for fee calculation.
 *
 * @param {string} tokenSymbol - Symbol of the token to transfer.
 * @param {string} sourceChain - Source chain (e.g., "ethereum").
 * @param {string} destinationChain - Destination chain (e.g., "base").
 * @param {number} usdAmount - Amount to transfer in USD.
 * @param {number} tokenPriceUSD - Token price in USD.
 * @param {number} decimals - Token decimals.
 * @param {string} inTokenAddress - Token contract address on the source chain.
 * @param {string} outTokenAddress - Token contract address on the destination chain.
 * @param {number|string} [gasPrice=5] - Gas price in Gwei.
 * @param {number|string} [slippage=1] - Slippage percentage.
 * @returns {string} - Fee information string (e.g. "99 bps ($0.0100)") or "Route not supported".
 */
async function calculateOpenOceanSwapFees(
  tokenSymbol,
  sourceChain,
  destinationChain,
  usdAmount,
  tokenPriceUSD,
  decimals,
  inTokenAddress,
  outTokenAddress,
  gasPrice = 5,
  slippage = 1
) {
  try {
    if (!tokenPriceUSD || isNaN(tokenPriceUSD) || tokenPriceUSD === '[Object]') {
      return null;
    }
    
    // Verify token support (log warning if not supported)
    const supportedIn = await isTokenSupported(sourceChain, inTokenAddress);
    const supportedOut = await isTokenSupported(sourceChain, outTokenAddress);
    if (!supportedIn || !supportedOut) {
      console.warn(
        `Token support check warning for ${tokenSymbol} on ${sourceChain}: ` +
        `inToken (${inTokenAddress}) supported: ${supportedIn}, outToken (${outTokenAddress}) supported: ${supportedOut}`
      );
      return "Route not supported";
    }
    
    // Calculate the human‑readable token amount from USD.
    const tokenAmount = usdAmount / tokenPriceUSD;
    const precision = Math.min(decimals, 8);
    const formattedAmount = parseFloat(tokenAmount.toString()).toFixed(precision);
    // Convert the human‑readable amount into minimal units for fee calculation.
    const minimalAmount = ethers.utils.parseUnits(formattedAmount, decimals).toString();
    
    const chainParam = getChainParam(sourceChain);
    const url = `https://open-api.openocean.finance/v4/${chainParam}/quote`;
    const params = {
      inTokenAddress,
      outTokenAddress,
      amount: formattedAmount, // human‑readable as required by documentation
      gasPrice: gasPrice.toString(),
      slippage: slippage.toString()
    };
    
    console.log(`OpenOcean fallback for ${tokenSymbol}: URL=${url}, Params=${JSON.stringify(params)}`);
    
    const response = await axios.get(url, { params });
    console.log(`OpenOcean API response for ${tokenSymbol}: ${JSON.stringify(response.data, null, 2)}`);
    
    if (response.data.code === 200 && response.data.data) {
      const data = response.data.data;
      const inAmountBN = ethers.BigNumber.from(minimalAmount);
      const outAmountBN = ethers.BigNumber.from(data.outAmount);
      
      if (inAmountBN.lt(outAmountBN)) {
        return `0 bps ($0.0000)`;
      }
      
      const feeBN = inAmountBN.sub(outAmountBN);
      const feeBasisPoints = feeBN.mul(10000).div(inAmountBN).toNumber();
      const feeUsd = parseFloat(ethers.utils.formatUnits(feeBN, decimals)) * tokenPriceUSD;
      return `${feeBasisPoints} bps ($${feeUsd.toFixed(4)})`;
    } else {
      return "Route not supported";
    }
  } catch (error) {
    console.error(`OpenOcean fee error for ${tokenSymbol}:`, error.message);
    return "Route not supported";
  }
}

module.exports = { calculateOpenOceanSwapFees };
