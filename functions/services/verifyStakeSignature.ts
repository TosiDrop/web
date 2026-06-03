import verifySignature from '@cardano-foundation/cardano-verify-datasignature';

const MESSAGE_PREFIX = 'Tosi preferences update';
// Mirrors signPreferencesUpdateMessage() on the client. The ISO timestamp
// bounds replay; the trailing digests bind the signature to the exact
// preference sets.
const MESSAGE_RE =
  /^Tosi preferences update for (stake[a-z0-9]+) at (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)\nfavorites: (\d+) \[([0-9a-f]{16})\]\ndislikes: (\d+) \[([0-9a-f]{16})\]$/;
const FRESHNESS_WINDOW_MS = 5 * 60 * 1000;

export type VerifyResult =
  | { ok: true }
  | { ok: false; status: number; reason: string };

interface VerifyInput {
  stakeAddress: string;
  favorites: string[];
  dislikes: string[];
  signature?: unknown;
  key?: unknown;
  message?: unknown;
  now?: Date;
}

export async function favoritesDigest(assetIds: string[]): Promise<string> {
  const sorted = [...assetIds].sort();
  const data = new TextEncoder().encode(sorted.join(','));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export async function verifyStakeSignature({
  stakeAddress,
  favorites,
  dislikes,
  signature,
  key,
  message,
  now = new Date(),
}: VerifyInput): Promise<VerifyResult> {
  if (typeof signature !== 'string' || typeof key !== 'string' || typeof message !== 'string') {
    return { ok: false, status: 401, reason: 'Missing or invalid signature payload' };
  }
  if (!message.startsWith(MESSAGE_PREFIX)) {
    return { ok: false, status: 401, reason: 'Unrecognized signing message' };
  }

  const match = MESSAGE_RE.exec(message);
  if (!match) {
    return { ok: false, status: 401, reason: 'Malformed signing message' };
  }
  const [, signedStake, signedAt, favCount, favDigest, disCount, disDigest] = match;

  if (signedStake !== stakeAddress) {
    return { ok: false, status: 401, reason: 'Signed stake address does not match request' };
  }

  const ts = Date.parse(signedAt);
  if (Number.isNaN(ts)) {
    return { ok: false, status: 401, reason: 'Invalid timestamp in signed message' };
  }
  if (Math.abs(now.getTime() - ts) > FRESHNESS_WINDOW_MS) {
    return { ok: false, status: 401, reason: 'Signed message is stale (>5 min)' };
  }

  if (Number(favCount) !== favorites.length) {
    return { ok: false, status: 401, reason: 'Favorite count does not match signed message' };
  }
  if ((await favoritesDigest(favorites)) !== favDigest) {
    return { ok: false, status: 401, reason: 'Favorites payload does not match signed message' };
  }
  if (Number(disCount) !== dislikes.length) {
    return { ok: false, status: 401, reason: 'Dislike count does not match signed message' };
  }
  if ((await favoritesDigest(dislikes)) !== disDigest) {
    return { ok: false, status: 401, reason: 'Dislikes payload does not match signed message' };
  }

  let verified: boolean;
  try {
    verified = verifySignature(signature, key, message, stakeAddress);
  } catch (err) {
    console.error('verifyStakeSignature crypto error:', err);
    return { ok: false, status: 401, reason: 'Signature verification failed' };
  }
  if (!verified) {
    return { ok: false, status: 401, reason: 'Signature does not match stake address' };
  }

  return { ok: true };
}
