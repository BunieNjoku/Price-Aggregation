/**
 * @fileoverview Global numeric constants, addresses, and ABIs.
 */
const { BigNumber } = require('ethers');
const JSBI = require('jsbi');

// Ethers constants for general use
const TWO = BigNumber.from(2);
const Q96 = TWO.pow(96); // 2^96 as ethers BigNumber
const Q192 = Q96.mul(Q96);
const MIN_TICK = -887272;
const MAX_TICK = 887272;

// Minimal Uniswap V3 Pool ABI (for slot0, liquidity, fee)
const UNISWAP_V3_POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() external view returns (uint128)',
  'function fee() external view returns (uint24)',
];

// JSBI constants for full-precision tick math & liquidity calculations
const JSBI_Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96));
const RESOLUTION = JSBI.BigInt(96);

// Uniswap V3 tick math boundary values:
const MIN_SQRT_RATIO = JSBI.BigInt('4295128739');
const MAX_SQRT_RATIO = JSBI.BigInt('1461446703485210103287273052203988822378723970342');

module.exports = {
  Q96,
  Q192,
  MIN_TICK,
  MAX_TICK,
  UNISWAP_V3_POOL_ABI,
  JSBI_Q96,
  RESOLUTION,
  MIN_SQRT_RATIO,
  MAX_SQRT_RATIO,
};
