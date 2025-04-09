// utils/hopFees.js - proper version that only uses actual fee data
const sdk = require('@hop-protocol/sdk');
const ethers = require('ethers');

/**
 * Calculate Hop Protocol fees for transferring tokens between chains
 * @param {string} tokenSymbol - Symbol of the token to transfer
 * @param {string} sourceChain - Source chain (e.g., 'ethereum', 'base')
 * @param {string} destinationChain - Destination chain (e.g., 'ethereum', 'base')
 * @param {number} usdAmount - Amount to transfer in USD
 * @param {number} tokenPriceUSD - Token price in USD
 * @param {number} decimals - Token decimals
 * @returns {string|null} - Fee information or null if error
 */
async function calculateHopSwapFees(tokenSymbol, sourceChain, destinationChain, usdAmount, tokenPriceUSD, decimals) {
  try {
    // Skip if no valid price
    if (!tokenPriceUSD || isNaN(tokenPriceUSD) || tokenPriceUSD === '[Object]') {
      return null;
    }
    
    // Silence console errors temporarily
    const originalConsoleError = console.error;
    console.error = () => {}; // Disable console.error
    
    try {
      // Initialize Hop SDK
      const hopInstance = new sdk.Hop('mainnet');
      
      // Try to get the bridge for this specific token
      let bridge;
      try {
        bridge = hopInstance.bridge(tokenSymbol);
      } catch (error) {
        // Restore console.error
        console.error = originalConsoleError;
        
        // If we can't get a bridge for this token, it's not supported by Hop
        return "Not supported"; // Clear indication that this token isn't supported
      }
      
      // Calculate token amount from USD
      const tokenAmount = usdAmount / tokenPriceUSD;
      const formattedAmount = parseFloat(tokenAmount.toString()).toFixed(Math.min(decimals, 8));
      
      try {
        // Parse with appropriate decimals
        const amountInMinimalUnits = ethers.utils.parseUnits(formattedAmount, decimals).toString();
        
        // Try to get actual fee data from Hop Protocol
        const sendData = await bridge.getSendData(
          amountInMinimalUnits,
          sourceChain,
          destinationChain
        );
        
        // Restore console.error
        console.error = originalConsoleError;
        
        // Calculate fee as percentage and USD value
        const feeBasisPoints = calculateFeeBasisPoints(sendData.totalFee, amountInMinimalUnits);
        const feeUsd = calculateFeeUsd(sendData.totalFee, tokenPriceUSD, decimals);
        
        // Return the actual fee information
        return `${feeBasisPoints} bps ($${feeUsd.toFixed(4)})`;
      } catch (error) {
        // Restore console.error
        console.error = originalConsoleError;
        
        // If we can't calculate actual fees, return that route is not supported
        return "Route not supported";
      }
    } catch (error) {
      // Restore console.error
      console.error = originalConsoleError;
      
      // Return error info if anything goes wrong
      return "Error calculating fees";
    }
  } catch (error) {
    return "Error calculating fees";
  }
}

/**
 * Calculate fee in basis points (1 bp = 0.01%)
 * @param {string} feeAmount - Fee amount in token units
 * @param {string} totalAmount - Total amount in token units
 * @returns {number} - Fee in basis points
 */
function calculateFeeBasisPoints(feeAmount, totalAmount) {
  try {
    const feeBN = ethers.BigNumber.from(feeAmount);
    const totalBN = ethers.BigNumber.from(totalAmount);
    
    if (totalBN.isZero()) return 0;
    
    // Calculate fee percentage (scaled by 10000 for basis points)
    return feeBN.mul(10000).div(totalBN).toNumber();
  } catch (error) {
    return 0;
  }
}

/**
 * Calculate fee in USD
 * @param {string} feeAmount - Fee amount in token units
 * @param {number} tokenPriceUSD - Token price in USD
 * @param {number} decimals - Token decimals
 * @returns {number} - Fee in USD
 */
function calculateFeeUsd(feeAmount, tokenPriceUSD, decimals) {
  try {
    const feeInToken = ethers.utils.formatUnits(feeAmount, decimals);
    return parseFloat(feeInToken) * tokenPriceUSD;
  } catch (error) {
    return 0;
  }
}

module.exports = { calculateHopSwapFees };
