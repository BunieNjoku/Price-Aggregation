// tokenDiscovery.js (updated)
const axios = require('axios');

const POOLS_QUERY = `
  query Pools($liquidityThreshold: String!) {
    pools(first: 1000, where: { liquidity_gt: $liquidityThreshold }) {
      id
      liquidity
      volumeUSD
      token0 { id symbol decimals name }
      token1 { id symbol decimals name }
    }
  }
`;

async function fetchPools(subgraphUrl, liquidityThreshold) {
  const response = await axios.post(
    subgraphUrl,
    { query: POOLS_QUERY, variables: { liquidityThreshold } },
    { timeout: 30000 }
  );
  if (response.data.errors) {
    throw new Error(JSON.stringify(response.data.errors));
  }
  return response.data.data.pools;
}

function aggregateTokens(pools) {
  const tokensMap = {};

  pools.forEach(pool => {
    [pool.token0, pool.token1].forEach(token => {
      const symbol = token.symbol;
      const liquidity = BigInt(pool.liquidity);
      const volumeUSD = pool.volumeUSD ? Number(pool.volumeUSD) : 0;

      if (!tokensMap[symbol]) {
        tokensMap[symbol] = {
          token,
          liquidity,
          volumeUSD,
          pools: [pool.id],
          repPool: pool,
        };
      } else {
        tokensMap[symbol].liquidity += liquidity;
        tokensMap[symbol].volumeUSD += volumeUSD;
        tokensMap[symbol].pools.push(pool.id);
        if (liquidity > BigInt(tokensMap[symbol].repPool.liquidity)) {
          tokensMap[symbol].repPool = pool;
        }
      }
    });
  });

  return tokensMap;
}

async function discoverTokens(chainName, liquidityThreshold) {
  const subgraphUrl = process.env[`${chainName.toUpperCase()}_SUBGRAPH_URL`];
  if (!subgraphUrl) throw new Error(`Missing subgraph URL for ${chainName}`);

  const pools = await fetchPools(subgraphUrl, liquidityThreshold);
  return aggregateTokens(pools);
}

async function getSortedTokens(chainName, liquidityThreshold) {
  const tokens = await discoverTokens(chainName, liquidityThreshold);
  return Object.values(tokens)
    .sort((a, b) => (b.liquidity > a.liquidity ? 1 : -1))
    .map(token => ({
      symbol: token.token.symbol,
      name: token.token.name,
      liquidity: token.liquidity.toString(),
      volumeUSD: token.volumeUSD,
      decimals: token.token.decimals,
      tokenAddress: token.token.id,
      repPool: token.repPool.id,
    }));
}

async function discoverAllTokensSorted(liquidityThreshold) {
  const [ethTokens, baseTokens] = await Promise.all([
    getSortedTokens('ethereum', liquidityThreshold),
    getSortedTokens('base', liquidityThreshold),
  ]);

  const ethSymbols = new Set(ethTokens.map(t => t.symbol.toLowerCase()));
  const baseSymbols = new Set(baseTokens.map(t => t.symbol.toLowerCase()));

  const commonSymbols = [...ethSymbols].filter(sym => baseSymbols.has(sym));

  const commonTokens = commonSymbols.map(sym => {
    const ethToken = ethTokens.find(t => t.symbol.toLowerCase() === sym);
    const baseToken = baseTokens.find(t => t.symbol.toLowerCase() === sym);
    return {
      symbol: ethToken.symbol,
      name: ethToken.name,
      ethereum: ethToken,
      base: baseToken,
    };
  });

  return { ethTokens, baseTokens, commonTokens };
}

module.exports = { discoverAllTokensSorted };
