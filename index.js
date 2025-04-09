// index.js (final robust version)
require('dotenv').config();
const { discoverAllTokensSorted } = require('./modules/tokenDiscovery');
const { fetchTokenPrices } = require('./utils/priceUtils');
const { calculateHopSwapFees } = require('./utils/hopFees');
const { calculateOpenOceanSwapFees } = require('./utils/openoceanFees');

async function main() {
  const liquidityThreshold = process.env.LIQUIDITY_THRESHOLD || "10000";
  const { ethTokens, baseTokens, commonTokens } = await discoverAllTokensSorted(liquidityThreshold);

  console.log("Ethereum Tokens Sorted by Liquidity:");
  console.table(ethTokens);

  console.log("Base Tokens Sorted by Liquidity:");
  console.table(baseTokens);

  console.log("Common Tokens:");
  console.table(commonTokens.map(token => ({
    symbol: token.symbol,
    ethereum: token.ethereum,
    base: token.base
  })));

  const symbols = commonTokens.map(token => token.symbol);
  const tokenPrices = await fetchTokenPrices(symbols);

  if (!tokenPrices || Object.keys(tokenPrices).length === 0) {
    console.error("Failed to retrieve token prices from Alchemy.");
    return;
  }

  const commonTokensDetailed = await Promise.all(commonTokens.map(async (token) => {
    const ethPrice = tokenPrices[token.symbol]?.ethereum;
    const basePrice = tokenPrices[token.symbol]?.base;

    if (!ethPrice || !basePrice) {
      console.warn(`Prices missing for token: ${token.symbol}`);
      return null;
    }

    // Attempt fee calculation via Hop.
    let feesEthToBase = await calculateHopSwapFees(
      token.symbol,
      'ethereum',
      'base',
      1,
      ethPrice,
      token.ethereum.decimals
    );
    let feesBaseToEth = await calculateHopSwapFees(
      token.symbol,
      'base',
      'ethereum',
      1,
      basePrice,
      token.base.decimals
    );

    // If Hop fee data is unavailable, fallback to OpenOcean using token addresses.
    if (feesEthToBase === "Route not supported" || feesEthToBase === "Not supported") {
      console.log(`Fallback: Calculating OpenOcean fees for ${token.symbol} from ethereum to base`);
      feesEthToBase = await calculateOpenOceanSwapFees(
        token.symbol,
        'ethereum',
        'base',
        1,
        ethPrice,
        token.ethereum.decimals,
        token.ethereum.tokenAddress,  // Ethereum token address
        token.base.tokenAddress       // Base token address
      );
    }
    if (feesBaseToEth === "Route not supported" || feesBaseToEth === "Not supported") {
      console.log(`Fallback: Calculating OpenOcean fees for ${token.symbol} from base to ethereum`);
      feesBaseToEth = await calculateOpenOceanSwapFees(
        token.symbol,
        'base',
        'ethereum',
        1,
        basePrice,
        token.base.decimals,
        token.base.tokenAddress,      // Base token address
        token.ethereum.tokenAddress   // Ethereum token address
      );
    }

    return {
      symbol: token.symbol,
      ethPrice,
      basePrice,
      feesEthToBase,
      feesBaseToEth,
    };
  }));

  console.log("Detailed Common Tokens with Prices and Fees:");
  console.table(commonTokensDetailed.filter(Boolean));
}

main().catch(error => console.error("Error running main script:", error));
