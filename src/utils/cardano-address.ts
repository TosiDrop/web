import { bech32 } from 'bech32';

const HEX_REGEX = /^[0-9a-fA-F]+$/;
const NETWORK_MASK = 0b0000_1111;

export const isHexAddress = (value: string): boolean => HEX_REGEX.test(value);

const hexToBytes = (hex: string): Uint8Array => {
  const cleaned = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
  }
  return bytes;
};

export const rewardAddressToBech32 = (address: string): string => {
  if (!address) return address;
  if (address.startsWith('stake')) return address;
  if (!isHexAddress(address)) return address;

  const bytes = hexToBytes(address);
  if (!bytes.length) return address;

  const networkId = bytes[0] & NETWORK_MASK;
  const hrp = networkId === 1 ? 'stake' : 'stake_test';
  const words = bech32.toWords(bytes);
  return bech32.encode(hrp, words);
};

