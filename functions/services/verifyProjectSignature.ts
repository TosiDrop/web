import verifySignature from '@cardano-foundation/cardano-verify-datasignature';
import {
  parseProjectListMessage,
  parseProjectMessage,
  projectDigest,
  type ProjectAction,
  type ProjectInput,
  type StakeAuth,
} from '../../src/shared/projects';

const FRESHNESS_WINDOW_MS = 5 * 60 * 1000;

export type VerifyResult = { ok: true } | { ok: false; status: number; reason: string };

interface VerifyInput {
  stakeAddress: string;
  project: ProjectInput;
  /** What this request does; the signed message must say the same. */
  action: ProjectAction;
  /** The project an update targets; null for create. */
  projectId: string | null;
  network: string;
  signature?: unknown;
  key?: unknown;
  message?: unknown;
  now?: Date;
}

export async function verifyProjectSignature({
  stakeAddress,
  project,
  action,
  projectId,
  network,
  signature,
  key,
  message,
  now = new Date(),
}: VerifyInput): Promise<VerifyResult> {
  if (typeof signature !== 'string' || typeof key !== 'string' || typeof message !== 'string') {
    return { ok: false, status: 401, reason: 'Missing or invalid signature payload' };
  }
  const signed = parseProjectMessage(message);
  if (!signed) return { ok: false, status: 401, reason: 'Malformed signing message' };
  if (signed.action !== action) {
    return { ok: false, status: 401, reason: `Signed message authorises ${signed.action}, not ${action}` };
  }
  if (signed.network !== network) {
    return { ok: false, status: 401, reason: 'Signed message is for a different network' };
  }
  if (signed.stakeAddress !== stakeAddress) {
    return { ok: false, status: 401, reason: 'Signed stake address does not match request' };
  }
  if (signed.projectId !== projectId) {
    return { ok: false, status: 401, reason: 'Signed message is for a different project' };
  }
  const ts = Date.parse(signed.signedAt);
  if (Number.isNaN(ts) || Math.abs(now.getTime() - ts) > FRESHNESS_WINDOW_MS) {
    return { ok: false, status: 401, reason: 'Signed message is stale (>5 min)' };
  }
  if ((await projectDigest(project)) !== signed.digest) {
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

/** A signed "list my projects" read: same freshness rule, no payload digest. */
export async function verifyProjectListSignature(
  { stakeAddress, network, auth, now = new Date() }: {
    stakeAddress: string;
    network: string;
    auth: StakeAuth;
    now?: Date;
  },
): Promise<VerifyResult> {
  const signed = parseProjectListMessage(auth.message);
  if (!signed) return { ok: false, status: 401, reason: 'Malformed signing message' };
  if (signed.network !== network) {
    return { ok: false, status: 401, reason: 'Signed message is for a different network' };
  }
  if (signed.stakeAddress !== stakeAddress) {
    return { ok: false, status: 401, reason: 'Signed stake address does not match request' };
  }
  const ts = Date.parse(signed.signedAt);
  if (Number.isNaN(ts) || Math.abs(now.getTime() - ts) > FRESHNESS_WINDOW_MS) {
    return { ok: false, status: 401, reason: 'Signed message is stale (>5 min)' };
  }
  let verified: boolean;
  try {
    verified = verifySignature(auth.signature, auth.key, auth.message, stakeAddress);
  } catch (err) {
    console.error('verifyProjectListSignature crypto error:', err);
    return { ok: false, status: 401, reason: 'Signature verification failed' };
  }
  if (!verified) return { ok: false, status: 401, reason: 'Signature does not match stake address' };
  return { ok: true };
}

/** Stable identifier for one signed request, used to make create idempotent. */
export async function signatureHash(signature: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
