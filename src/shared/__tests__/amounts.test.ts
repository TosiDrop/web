import { describe, expect, it } from 'vitest';
import { decimalAmountToNumber } from '../amounts';

describe('decimalAmountToNumber', () => {
  it('places decimals before converting to a Number', () => {
    expect(decimalAmountToNumber('18192972080000001', 9)).toBe(18192972.080000002);
  });

  it('rejects malformed or unsafe decimal metadata', () => {
    expect(decimalAmountToNumber('not-an-integer', 6)).toBeNaN();
    expect(decimalAmountToNumber('1', 39)).toBeNaN();
  });
});
