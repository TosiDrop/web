import verifySignature from '@cardano-foundation/cardano-verify-datasignature';
import { PROJECT_MESSAGE_RE, projectDigest, type ProjectInput } from '../../src/shared/projects';

const FRESHNESS_WINDOW_MS = 5 * 60 * 1000;

export type VerifyResult = { ok: true } | { ok: false; status: number; reason: string };

interface VerifyInput {
  stakeAddress: string;
  project: ProjectInput;
  signature?: unknown;
  key?: unknown;
  message?: unknown;
  now?: Date;
}

export async function verifyProjectSignature({
  stakeAddress,
  project,
  signature,
  key,
  message,
  now = new Date(),
}: VerifyInput): Promise<VerifyResult> {
  if (typeof signature !== 'string' || typeof key !== 'string' || typeof message !== 'string') {
    return { ok: false, status: 401, reason: 'Missing or invalid signature payload' };
  }
  const match = PROJECT_MESSAGE_RE.exec(message);
  if (!match) return { ok: false, status: 401, reason: 'Malformed signing message' };
  const [, signedStake, signedAt, digest] = match;
  if (signedStake !== stakeAddress) {
    return { ok: false, status: 401, reason: 'Signed stake address does not match request' };
  }
  const ts = Date.parse(signedAt);
  if (Number.isNaN(ts) || Math.abs(now.getTime() - ts) > FRESHNESS_WINDOW_MS) {
    return { ok: false, status: 401, reason: 'Signed message is stale (>5 min)' };
  }
  if ((await projectDigest(project)) !== digest) {
    return { ok: false, status: 401, reason: 'Project payload does not match signed message' };
  }

  let verified: boolean;
  try {
    verified = verifySignature(signature, key, message, stakeAddress);
  } catch (err) {
    console.error('verifyProjectSignature crypto error:', err);
    return { ok: false, status: 401, reason: 'Signature verification failed' };
  }
  if (!verified) return { ok: false, status: 401, reason: 'Signature does not match stake address' };
  return { ok: true };
}
