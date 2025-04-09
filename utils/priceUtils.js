// utils/priceUtils.js - separated chain fetches
const axios = require('axios');

// Store for the common tokens list
let commonTokensList = [];

/**
 * Fetch prices for a specific chain
 * @param {string[]} symbols - Token symbols to fetch
 * @param {string} chain - Chain to fetch prices for ('ethereum' or 'base')
 * @param {string} apiKey - Alchemy API key
 * @returns {Object} Mapping of symbols to prices
 */
async function fetchChainPrices(symbols, chain, apiKey) {
  const chainUrls = {
    ethereum: 'https://api.g.alchemy.com/prices/v1/tokens/by-symbol',
    base: 'https://base-mainnet.g.alchemy.com/prices/v1/tokens/by-symbol'
  };

  const url = chainUrls[chain];
  if (!url) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  console.log(`Fetching prices for ${chain.toUpperCase()} chain...`);
  
  // Result object for this chain
  const chainPrices = {};
  
  // Initialize with [Object] for all symbols
  symbols.forEach(symbol => {
    chainPrices[symbol] = '[Object]';
  });
  
  // Process in batches of 3
  const batchSize = 3;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batchSymbols = symbols.slice(i, i + batchSize);
    
    // Build query parameters
    const symbolsParam = batchSymbols.map(s => `symbols=${encodeURIComponent(s)}`).join('&');
    const batchUrl = `${url}?${symbolsParam}`;
    
    console.log(`Fetching ${chain} batch ${i/batchSize + 1}/${Math.ceil(symbols.length/batchSize)}: ${batchSymbols.join(', ')}`);
    
    try {
      // Make the request
      const response = await axios.get(batchUrl, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000
      });
      
      // Process response data
      if (response.data && response.data.data) {
        response.data.data.forEach(token => {
          if (token.symbol && token.prices && token.prices.length > 0) {
            const usdPrice = token.prices.find(p => p.currency === 'usd');
            if (usdPrice && usdPrice.value) {
              // Store the price for this token
              chainPrices[token.symbol] = parseFloat(usdPrice.value);
              console.log(`✅ Got ${chain} price for ${token.symbol}: $${usdPrice.value}`);
            }
          }
        });
      }
    } catch (error) {
      console.error(`${chain} batch ${i/batchSize + 1} failed:`, error.message);
    }
    
    // Small delay between batches
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  
  return chainPrices;
}

/**
 * Fetches token prices from Alchemy API for both Ethereum and Base chains
 * @param {string[]} symbols - Array of token symbols to fetch prices for
 * @param {Object} options - Optional configuration
 * @param {string} options.apiKey - Alchemy API key
 * @returns {Object} - Object with ethPrices and basePrices
 */
async function fetchTokenPrices(symbols, options = {}) {
  const { apiKey = process.env.ALCHEMY_API_KEY } = options;
  
  if (!apiKey) {
    throw new Error('API key is required for fetching token prices');
  }
  
  // Fetch prices for each chain separately to ensure they're different
  const ethPrices = await fetchChainPrices(symbols, 'ethereum', apiKey);
  const basePrices = await fetchChainPrices(symbols, 'base', apiKey);
  
  // Create the combined results object
  const results = {};
  symbols.forEach(symbol => {
    results[symbol] = {
      ethereum: ethPrices[symbol],
      base: basePrices[symbol]
    };
  });
  
  // Create the common tokens list with separate prices
  commonTokensList = symbols.map((symbol, index) => ({
    index,
    symbol, 
    ethPrice: ethPrices[symbol],
    basePrice: basePrices[symbol],
    feesEthToBase: null,
    feesBaseToEth: null
  }));
  
  return results;
}

/**
 * Logs the token prices in the same format as the example output
 * @param {Object} results - The results object from fetchTokenPrices
 */
function logTokenPrices(results) {
  console.log('Common Tokens:');
  
  // Convert to array format for console.table
  const tableData = Object.entries(results).map(([symbol, data], index) => ({
    '(index)': index,
    'symbol': `'${symbol}'`,
    'ethereum': data.ethereum,
    'base': data.base
  }));
  
  // Display the table
  console.table(tableData);
  
  // Log missing prices
  const missingPrices = Object.entries(results)
    .filter(([_, data]) => 
      data.ethereum === '[Object]' && data.base === '[Object]')
    .map(([symbol]) => symbol);
  
  missingPrices.forEach(symbol => {
    console.log(`Prices missing for token: ${symbol}`);
  });
  
  // Log detailed tokens with prices
  console.log('Detailed Common Tokens with Prices and Fees:');
  
  if (commonTokensList.length > 0) {
    console.table(commonTokensList);
  } else {
    console.log('┌─────────┐');
    console.log('│ (index) │');
    console.log('├─────────┤');
    console.log('└─────────┘');
  }
}

/**
 * Get the common tokens list with prices
 * @returns {Array} The common tokens with prices
 */
function getCommonTokens() {
  return commonTokensList;
}

module.exports = { 
  fetchTokenPrices, 
  logTokenPrices,
  getCommonTokens
};