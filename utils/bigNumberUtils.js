/**
 * @fileoverview Utility functions for high‑precision arithmetic and conversions.
 */
const BN = require('bignumber.js');
BN.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

/**
 * computePoolPrice computes the pool price from Uniswap V3’s sqrtPriceX96.
 *
 * Formula:
 *    P = (sqrtPriceX96^2 / 2^192) * 10^(token0Decimals - token1Decimals)
 *
 * where P is the price of token0 expressed in units of token1.
 *
 * @param {string} sqrtPriceX96Str - The sqrtPriceX96 value as a string.
 * @param {number} token0Decimals - Decimals for token0.
 * @param {number} token1Decimals - Decimals for token1.
 * @return {string} Computed price as a decimal string.
 */
function computePoolPrice(sqrtPriceX96Str, token0Decimals, token1Decimals) {
  const sqrtPriceX96 = new BN(sqrtPriceX96Str);
  const Q192 = new BN(2).pow(192);
  // Price = (sqrtPriceX96^2 / 2^192) * 10^(token0Decimals - token1Decimals)
  const numerator = sqrtPriceX96.times(sqrtPriceX96).times(new BN(10).pow(token0Decimals));
  const denominator = Q192.times(new BN(10).pow(token1Decimals));
  const price = numerator.dividedBy(denominator);
  return price.toFixed();
}

function toEthersBN(value) {
  const { BigNumber } = require("ethers");
  return BigNumber.from(value.toString());
}

function toBN(value) {
  return new BN(value.toString());
}

function bnDivide(numerator, denominator) {
  if (denominator.isZero()) throw new Error('Division by zero');
  return numerator.div(denominator).toFixed();
}

function scaleValue(value, decimals) {
  const factor = new BN(10).pow(decimals);
  const scaled = toBN(value).times(factor).integerValue(BN.ROUND_FLOOR);
  return toEthersBN(scaled.toFixed());
}

function descaleValue(bnValue, decimals) {
  const factor = toBN(10).pow(decimals);
  return toBN(bnValue.toString()).div(factor).toFixed();
}

module.exports = {
  computePoolPrice,
  toEthersBN,
  toBN,
  bnDivide,
  scaleValue,
  descaleValue,
};
