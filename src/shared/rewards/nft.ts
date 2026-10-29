import { catalogAssetId } from '../assets';
import { isNativeToken, type NftRewardMetadata, type TokenInfo } from './index';

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown, max = 200): string | null {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max ? value.trim() : null;
}

/** Image URLs are rendered by the browser only; metadata never becomes HTML. */
export function nftImageUrl(value: unknown): string | null {
  const parts = Array.isArray(value) && value.length <= 64 && value.every((part) => typeof part === 'string') ? value as string[] : null;
  // CIP-25/68 split URI arrays begin with the URI scheme, not arbitrary CID fragments.
  if (parts && !/^(https:\/\/|ipfs:\/\/|ar:\/\/|data:)/.test(parts[0] ?? '')) return null;
  const uri = text(parts ? parts.join('') : value, 4096);
  if (!uri || Array.from(uri).some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)) return null;
  if (/^data:image\/(png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/.test(uri)) return uri;
  const ipfs = /^ipfs:\/\/(?:ipfs\/)?((?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,})(?:\/[^?#]*)?)$/.exec(uri);
  if (ipfs) return `https://ipfs.io/ipfs/${ipfs[1]}`;
  const arweave = /^ar:\/\/([A-Za-z0-9_-]{43}(?:\/[^?#]*)?)$/.exec(uri);
  if (arweave) return `https://arweave.net/${arweave[1]}`;
  try {
    const url = new URL(uri);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function assetParts(assetId: string): { policy: string; nameHex: string } | null {
  const match = /^([a-f0-9]{56})\.((?:[a-f0-9]{2}){0,32})$/i.exec(catalogAssetId(assetId));
  return match ? { policy: match[1], nameHex: match[2] } : null;
}
function utf8(hex: string): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(hex.match(/../g) ?? [], (byte) => parseInt(byte, 16)));
  } catch { return null; }
}
function matchingMetadata(value: unknown, assetId: string, cip68: boolean): Record<string, unknown> {
  const metadata = record(value);
  if (!Object.hasOwn(metadata, '721')) return metadata;
  const parts = assetParts(assetId);
  if (!parts) return {};
  const label = record(metadata['721']);
  const policy = record(label[parts.policy]);
  const nameHex = cip68 ? parts.nameHex.slice(8) : parts.nameHex;
  const name = Number(label.version ?? 1) === 2 ? nameHex : utf8(nameHex);
  return name === null ? {} : record(policy[name]);
}

/** Explicit provider identity or CIP-68's 222 label. Amount, decimals and CIP-25 media alone never establish NFT identity. */
export function nftRewardMetadata(assetId: string, token: TokenInfo): NftRewardMetadata | undefined {
  if (isNativeToken(assetId)) return undefined;
  const type = text(token.assetType ?? token.type)?.toLowerCase();
  if (token.isNFT === false || type === 'fungible' || type === 'ft') return undefined;
  const explicit = token.isNFT === true || type === 'nft' || type === 'non-fungible';
  const cip68 = assetParts(assetId)?.nameHex.startsWith('000de140') ?? false;
  if (!explicit && !cip68) return undefined;
  const metadata = matchingMetadata(token.metadata, assetId, cip68);
  return {
    name: text(metadata.name) ?? text(token.name),
    image: nftImageUrl(metadata.image) ?? nftImageUrl(token.image) ?? nftImageUrl(token.logo),
    collection: text(metadata.collection) ?? text(token.collection),
    identitySource: explicit ? 'provider' : 'cip68',
  };
}
