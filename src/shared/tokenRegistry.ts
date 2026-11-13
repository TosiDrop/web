import type { Network } from './network';
import { readResponseBodyWithLimit } from './readLimitedBody';

// Cardano Foundation off-chain metadata servers. The testnet server holds the
// Preview and Preprod registrations.
const REGISTRY_BASE: Record<Network, string> = {
  mainnet: 'https://tokens.cardano.org',
  preview: 'https://metadata.world.dev.cardano.org',
};
const SUBJECT = /^[0-9a-f]{56}(?:[0-9a-f]{2}){0,32}$/i;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Registry subject (policy id + asset name hex) for a `policy.name` asset id, or null if it is not one. */
export function registrySubject(assetId: string): string | null {
  const subject = assetId.replace('.', '');
  return SUBJECT.test(subject) ? subject.toLowerCase() : null;
}

/** The registered logo as PNG bytes, or null when the registry has none. Registry logos are base64 PNGs. */
export async function fetchRegistryLogo(
  assetId: string,
  network: Network,
  maxBytes: number,
): Promise<ArrayBuffer | null> {
  const subject = registrySubject(assetId);
  if (!subject) return null;

  const res = await fetch(`${REGISTRY_BASE[network]}/metadata/${subject}/properties/logo`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status !== 200) return null; // 204 or 404: not registered
  // Base64 is 4/3 of the decoded size, plus a little JSON around it.
  const body = await readResponseBodyWithLimit(res, Math.ceil(maxBytes * 1.4) + 4096);
  if (!body) return null;

  const value = (JSON.parse(new TextDecoder().decode(body)) as { logo?: { value?: unknown } }).logo?.value;
  if (typeof value !== 'string' || !value) return null;
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  if (bytes.byteLength > maxBytes || !PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return null;
  return bytes.buffer;
}
