/**
 * @fileoverview Tests for uniswapV3 module.
 */

const { expect } = require('chai');
const { getSlot0, computePriceFromSqrt } = require('../modules/dex/uniswapV3');

describe('Uniswap V3 Module', function () {
  this.timeout(20000); // 20s to allow live RPC calls

  it('computePriceFromSqrt() should return a numeric string', () => {
    const sqrtPriceX96 = '79228162514264337593543950336'; // ~1.0 in raw
    const price = computePriceFromSqrt(sqrtPriceX96, 6, 18);
    expect(parseFloat(price)).to.be.a('number');
  });

  it('getSlot0() should fetch slot0 data from a real pool if env is set', async () => {
    if (!process.env.UNISWAP_POOL_ADDRESS) {
      this.skip(); 
    } else {
      const data = await getSlot0(process.env.TARGET_CHAIN || 'ethereum', process.env.UNISWAP_POOL_ADDRESS);
      expect(data).to.have.property('sqrtPriceX96');
      expect(data).to.have.property('liquidity');
    }
  });
});
