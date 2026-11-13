import { describe, expect, it } from 'vitest';
import { nftImageUrl, nftRewardMetadata } from '..';
const POLICY = 'a'.repeat(56);
const ID = `${POLICY}.41727431`;

describe('NFT reward metadata', () => {
  it.each([{ assetType: 'NFT' }, { type: 'non-fungible' }, { isNFT: true }])('accepts explicit provider identity %j', (token) => {
    expect(nftRewardMetadata(ID, token)?.identitySource).toBe('provider');
  });
  it.each([
    { decimals: 0, amount: 1 },
    { metadata: { name: 'FT image', image: 'https://example.com/ft.png' } },
    { metadata: { '721': { [POLICY]: { Art1: { name: 'Media token', image: 'https://example.com/ft.png' } } } } },
    { isNFT: 'true' },
  ])('keeps fungible or unknown assets outside the NFT gallery %j', (token) => {
    expect(nftRewardMetadata(ID, token)).toBeUndefined();
  });
  it('recognizes the CIP-68 user NFT label and excludes fungible/reference labels', () => {
    expect(nftRewardMetadata(`${POLICY}.000de14041727431`, {})?.identitySource).toBe('cip68');
    expect(nftRewardMetadata(`${POLICY}000de14041727431`, {})?.identitySource).toBe('cip68');
    expect(nftRewardMetadata(`${POLICY}.0014df1041727431`, {})).toBeUndefined();
    expect(nftRewardMetadata(`${POLICY}.000643b041727431`, {})).toBeUndefined();
    expect(nftRewardMetadata('invalid.000de14041727431', {})).toBeUndefined();
  });
  it('honors explicit fungible identity and excludes ADA even when metadata claims NFT', () => {
    expect(nftRewardMetadata(`${POLICY}.000de14041727431`, { assetType: 'fungible', isNFT: false })).toBeUndefined();
    expect(nftRewardMetadata('lovelace', { isNFT: true })).toBeUndefined();
  });
  it('resolves only the matching CIP-25 policy and UTF-8 asset name', () => {
    expect(nftRewardMetadata(ID, { isNFT: true, metadata: { '721': { [POLICY]: { Other: { name: 'Wrong' }, Art1: { name: 'Art 1', image: ['ipfs://', 'QmbQDvKJeo2NgGcGdnUiUFibTzuKNK5Uij7jzmK8ZccmWp'], collection: 'Gallery' } } } } })).toEqual({
      name: 'Art 1', image: 'https://ipfs.io/ipfs/QmbQDvKJeo2NgGcGdnUiUFibTzuKNK5Uij7jzmK8ZccmWp', collection: 'Gallery', identitySource: 'provider',
    });
  });
  it('resolves CIP-25 version 2 hex names and CIP-68 unlabelled metadata keys', () => {
    const metadata = { '721': { version: 2, [POLICY]: { '41727431': { name: 'Hex art', image: 'https://example.com/hex.png' } } } };
    expect(nftRewardMetadata(ID, { type: 'nft', metadata })?.name).toBe('Hex art');
    expect(nftRewardMetadata(`${POLICY}.000de14041727431`, { metadata })?.name).toBe('Hex art');
  });
  it('drops malformed and oversized metadata while retaining explicit claim identity', () => {
    expect(nftRewardMetadata(ID, { isNFT: true, metadata: { name: 'x'.repeat(201), collection: { unexpected: true }, image: ['https://example.com/', 9] } })).toEqual({ name: null, image: null, collection: null, identitySource: 'provider' });
  });
});

describe('NFT artwork URL validation', () => {
  it.each(['javascript:alert(1)', 'http://example.com/a.png', '//example.com/a.png', 'https://user:pass@example.com/art', 'data:text/html;base64,abc', 'data:image/svg+xml;base64,abc', ['Qm', 'abc'], ['https://example.com/', 'x'.repeat(4096)], {}, null])('rejects unsafe or malformed artwork %j', (input) => {
    expect(nftImageUrl(input)).toBeNull();
  });
  it('normalizes supported IPFS, Arweave and inline raster sources', () => {
    expect(nftImageUrl(['ipfs://', 'QmbQDvKJeo2NgGcGdnUiUFibTzuKNK5Uij7jzmK8ZccmWp'])).toBe('https://ipfs.io/ipfs/QmbQDvKJeo2NgGcGdnUiUFibTzuKNK5Uij7jzmK8ZccmWp');
    expect(nftImageUrl(`ar://${'a'.repeat(43)}`)).toBe(`https://arweave.net/${'a'.repeat(43)}`);
    expect(nftImageUrl('data:image/png;base64,aGVsbG8=')).toBe('data:image/png;base64,aGVsbG8=');
  });
});
