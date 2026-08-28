import { describe, expect, it } from 'vitest';
import { isStakeAddress, stakeAddressError } from '../stakeAddress';
import { MAINNET_STAKE, PREVIEW_STAKE } from './stakeAddresses';

describe('stakeAddressError', () => {
  it('accepts a checksummed address of the deployment network', () => {
    expect(isStakeAddress(MAINNET_STAKE, 'mainnet')).toBe(true);
    expect(isStakeAddress(PREVIEW_STAKE, 'preview')).toBe(true);
  });

  it('rejects a bad checksum even when prefix, charset and length look right', () => {
    expect(isStakeAddress(MAINNET_STAKE.slice(0, -1) + 'q', 'mainnet')).toBe(false);
    expect(isStakeAddress('stake1' + 'q'.repeat(53), 'mainnet')).toBe(false);
  });

  it('names the network when the address belongs to the other one', () => {
    expect(stakeAddressError(PREVIEW_STAKE, 'mainnet')).toBe(
      'That is a Preview stake address; this site is on Mainnet.',
    );
    expect(stakeAddressError(MAINNET_STAKE, 'preview')).toBe(
      'That is a Mainnet stake address; this site is on Preview.',
    );
  });

  it('rejects payment addresses and garbage', () => {
    expect(isStakeAddress('addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x', 'mainnet')).toBe(false);
    expect(isStakeAddress('stake1notreal', 'mainnet')).toBe(false);
    expect(isStakeAddress('', 'preview')).toBe(false);
  });
});
