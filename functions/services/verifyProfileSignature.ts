import verifySignature from '@cardano-foundation/cardano-verify-datasignature';

const MESSAGE_PREFIX = 'Tosi profile update';
// Matches buildProfileMessage() on the client. The ISO 8601 timestamp captures
// when the user authorized the write so we can reject stale/replayed payloads.
const MESSAGE_RE =
  /^Tosi profile update for (stake[a-z0-9]+) at (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)$/;

const FRESHNESS_WINDOW_MS = 5 * 60 * 1000;

export type VerifyResult =
  | { ok: true }
  | { ok: false; status: number; reason: string };

interface VerifyInput {
  stakeAddress: string;
  signature?: unknown;
  key?: unknown;
  message?: unknown;
  now?: Date;
}

export function verifyProfileSignature({
  stakeAddress,
  signature,
  key,
  message,
  now = new Date(),
}: VerifyInput): VerifyResult {
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
  const [, signedStake, signedAt] = match;
  if (signedStake !== stakeAddress) {
    return { ok: false, status: 401, reason: 'Signed stake address does not match request' };
  }

  const ts = Date.parse(signedAt);
  if (Number.isNaN(ts)) {
    return { ok: false, status: 401, reason: 'Invalid timestamp in signed message' };
  }
  const skew = Math.abs(now.getTime() - ts);
  if (skew > FRESHNESS_WINDOW_MS) {
    return { ok: false, status: 401, reason: 'Signed message is stale (>5 min)' };
  }

  let verified: boolean;
  try {
    verified = verifySignature(signature, key, message, stakeAddress);
  } catch (err) {
    console.error('verifyProfileSignature crypto error:', err);
    return { ok: false, status: 401, reason: 'Signature verification failed' };
  }
  if (!verified) {
    return { ok: false, status: 401, reason: 'Signature does not match stake address' };
  }

  return { ok: true };
}
