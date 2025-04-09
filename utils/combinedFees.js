// combinedFees.js - Use Hop Protocol with OpenOcean fallback
const { calculateHopSwapFees, SUPPORTED_TOKENS } = require('./hopFees');
const { calculateOpenOceanFees } = require('./openoceanFees');

/**
 * Calculate fees with Hop Protocol, falling back to OpenOcean
 * @param {Object} token - Token object with symbol and addresses 
 * @param {string} sourceChain - Source chain
 * @param {string} destinationChain - Destination chain
 * @param {number} usdAmount - Amount to transfer in USD
 * @param {number} tokenPriceUSD - Token price in USD
 * @param {number} decimals - Token decimals
 * @returns {Promise<Object>} - Fee information
 */
async function calculateCombinedFees(token, sourceChain, destinationChain, usdAmount, tokenPriceUSD, decimals) {
  // First try Hop Protocol for officially supported tokens
  const isOfficiallySupported = SUPPORTED_TOKENS.includes(token.symbol.toUpperCase());
  
  if (isOfficiallySupported) {
    try {
      const hopResult = await calculateHopSwapFees(
        token.symbol,
        sourceChain,
        destinationChain,
        usdAmount,
        tokenPriceUSD,
        decimals
      );
      
      // If Hop was successful, return its result
      if (hopResult.status === "success") {
        return {
          ...hopResult,
          provider: "Hop Protocol"
        };
      }
      
      // Even for supported tokens, the specific route might not be available
      console.log(`Hop Protocol route not available for ${token.symbol} from ${sourceChain} to ${destinationChain}. Trying OpenOcean...`);
    } catch (error) {
      console.log(`Error with Hop Protocol for ${token.symbol}: ${error.message}`);
    }
  }
  
  // If token not supported by Hop or route not available, try OpenOcean
  try {
    // Get the appropriate token data 
    const tokenData = {
      symbol: token.symbol,
      address: token[sourceChain]?.address,
      decimals: decimals
    };
    
    if (!tokenData.address) {
      return {
        status: "error",
        message: `No address found for ${token.symbol} on ${sourceChain}`,
        fee: null,
        provider: "None"
      };
    }
    
    const openOceanResult = await calculateOpenOceanFees(
      tokenData,
      sourceChain,
      destinationChain,
      usdAmount,
      tokenPriceUSD,
      decimals
    );
    
    // Return OpenOcean result with provider info
    if (openOceanResult.status === "success" || openOceanResult.status === "estimated") {
      return {
        ...openOceanResult,
        provider: openOceanResult.provider || "OpenOcean"
      };
    }
    
    // Both providers failed
    return {
      status: "error",
      message: `Both Hop and OpenOcean failed for ${token.symbol}. OpenOcean error: ${openOceanResult.message}`,
      fee: null,
      provider: "None"
    };
    
  } catch (error) {
    return {
      status: "error",
      message: `Error in fee calculation: ${error.message}`,
      fee: null,
      provider: "None"
    };
  }
}

/**
 * Simple version that returns just the fee string
 */
async function calculateCombinedFeesString(token, sourceChain, destinationChain, usdAmount, tokenPriceUSD, decimals) {
  const result = await calculateCombinedFees(token, sourceChain, destinationChain, usdAmount, tokenPriceUSD, decimals);
  
  if (result.status === "success" || result.status === "estimated") {
    return `${result.fee} (via ${result.provider})`;
  } else if (result.status === "unsupported_route") {
    return "Route not supported";
  } else if (result.status === "unsupported_chain") {
    return "Chain not supported";
  } else {
    return "Not available";
  }
}

module.exports = {
  calculateCombinedFees,
  calculateCombinedFeesString,
  SUPPORTED_TOKENS
};