import { describe, expect, it } from 'vitest';
import { isAdaHandle, isStakeAddress, stakeAddressError } from '../ada-handle';

// CIP-19 reference mainnet address, and the same credential re-encoded for a testnet.
const MAINNET = 'stake1uyehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gh6ffgw';
const PREVIEW = 'stake_test1uqehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gssrtvn';

describe('stake address validation', () => {
  it('accepts a checksummed address of the deployment network', () => {
    expect(isStakeAddress(MAINNET, 'mainnet')).toBe(true);
    expect(isStakeAddress(PREVIEW, 'preview')).toBe(true);
  });

  it('rejects a bad checksum even when prefix, charset and length look right', () => {
    const corrupted = MAINNET.slice(0, -1) + (MAINNET.endsWith('w') ? 'q' : 'w');
    expect(isStakeAddress(corrupted, 'mainnet')).toBe(false);
    expect(isStakeAddress('stake1' + 'q'.repeat(53), 'mainnet')).toBe(false);
  });

  it('rejects the other network and says which one it is', () => {
    expect(stakeAddressError(PREVIEW, 'mainnet')).toBe(
      'That is a Preview stake address; this site is on Mainnet.',
    );
    expect(stakeAddressError(MAINNET, 'preview')).toBe(
      'That is a Mainnet stake address; this site is on Preview.',
    );
  });

  it('rejects payment addresses and garbage', () => {
    expect(isStakeAddress('addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x', 'mainnet')).toBe(false);
    expect(isStakeAddress('notastakeaddress', 'mainnet')).toBe(false);
    expect(isStakeAddress('', 'mainnet')).toBe(false);
  });

  it('recognises handles', () => {
    expect(isAdaHandle('$tosi')).toBe(true);
    expect(isAdaHandle('$')).toBe(false);
    expect(isAdaHandle(MAINNET)).toBe(false);
  });
});
