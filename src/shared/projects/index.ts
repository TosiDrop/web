// Shared between the Pages Functions and the client: the project payload, the
// digest that binds a CIP-30 signature to it, and the signing message format.

export const PROJECT_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type ProjectAction = 'create' | 'update';

export interface DistributionConfig {
  /** Token units (already decimal-adjusted) distributed per epoch. */
  amountPerEpoch: string;
  /** Minimum delegated ADA to qualify; empty means no minimum. */
  minStakeAda: string;
  /** Epochs a reward stays claimable before it expires. */
  expiryEpochs: number;
}

export interface ProjectInput {
  name: string;
  description: string;
  website: string;
  logoUrl: string;
  tokenId: string;
  poolId: string;
  distribution: DistributionConfig;
}

export interface Project extends ProjectInput {
  id: string;
  network: string;
  ownerAddress: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
}

export const PROJECT_LIMITS = {
  name: 80,
  description: 1000,
  website: 300,
  logoUrl: 600_000,
  tokenId: 120,
  poolId: 80,
  distributionJson: 2000,
  /** Total ADA supply; no real minimum stake can exceed it. */
  maxMinStakeAda: 45_000_000_000,
  maxExpiryEpochs: 1000,
} as const;

export const EMPTY_DISTRIBUTION: DistributionConfig = {
  amountPerEpoch: '',
  minStakeAda: '',
  expiryEpochs: 0,
};

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/**
 * Coerce arbitrary input into the exact shape that gets signed and stored.
 * Client and server both run this, so the digest is computed over identical
 * bytes on both sides.
 */
export function normalizeProjectInput(raw: unknown): ProjectInput {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = (p.distribution && typeof p.distribution === 'object'
    ? p.distribution
    : {}) as Record<string, unknown>;
  const expiry = Number(d.expiryEpochs ?? 0);
  return {
    name: str(p.name).trim(),
    description: str(p.description).trim(),
    website: str(p.website).trim(),
    logoUrl: str(p.logoUrl).trim(),
    tokenId: str(p.tokenId).trim(),
    poolId: str(p.poolId).trim(),
    distribution: {
      amountPerEpoch: str(d.amountPerEpoch).trim(),
      minStakeAda: str(d.minStakeAda).trim(),
      expiryEpochs: Number.isFinite(expiry) ? expiry : 0,
    },
  };
}

/** Plain non-negative decimal: digits with an optional fraction, no sign, no exponent. */
const DECIMAL_RE = /^\d{1,15}(\.\d{1,18})?$/;

/** Returns a human-readable problem, or null when the input is acceptable. */
export function validateProjectInput(input: ProjectInput): string | null {
  const L = PROJECT_LIMITS;
  if (!input.name) return 'name is required';
  if (input.name.length > L.name) return `name exceeds ${L.name} chars`;
  if (input.description.length > L.description) return `description exceeds ${L.description} chars`;
  if (input.website.length > L.website) return `website exceeds ${L.website} chars`;
  if (input.website && !/^https?:\/\//i.test(input.website)) return 'website must start with http(s)://';
  if (input.logoUrl.length > L.logoUrl) return 'logoUrl is too large';
  if (!input.tokenId) return 'tokenId is required';
  if (input.tokenId.length > L.tokenId) return 'tokenId is too long';
  if (input.poolId && !/^pool1[a-z0-9]{20,}$/.test(input.poolId)) return 'poolId must be a bech32 pool id';

  const { amountPerEpoch, minStakeAda, expiryEpochs } = input.distribution;
  if (!DECIMAL_RE.test(amountPerEpoch) || Number(amountPerEpoch) <= 0) {
    return 'distribution.amountPerEpoch must be a positive decimal amount';
  }
  if (minStakeAda !== '' && (!DECIMAL_RE.test(minStakeAda) || Number(minStakeAda) > L.maxMinStakeAda)) {
    return `distribution.minStakeAda must be a decimal ADA amount up to ${L.maxMinStakeAda.toLocaleString('en-US')}`;
  }
  if (!Number.isInteger(expiryEpochs) || expiryEpochs < 0 || expiryEpochs > L.maxExpiryEpochs) {
    return `distribution.expiryEpochs must be an integer from 0 to ${L.maxExpiryEpochs}`;
  }
  if (JSON.stringify(input.distribution).length > L.distributionJson) return 'distribution is too large';
  return null;
}

/**
 * Signing message. Everything the server authorises on is in the text the
 * wallet shows and signs: the operation, the deployment network, the owner,
 * the project being updated (or "new"), a timestamp for freshness, and the
 * payload digest. A signature therefore cannot be replayed against another
 * operation, project, or network.
 */
const MESSAGE_PREFIX = 'Tosi project';
export const PROJECT_MESSAGE_RE =
  /^Tosi project (create|update) on (mainnet|preview) for (stake(?:_test)?1[a-z0-9]+) at (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)\nproject: (new|[0-9a-f-]{36}) \[([0-9a-f]{16})\]$/;

export interface ProjectMessageParts {
  action: ProjectAction;
  network: string;
  stakeAddress: string;
  /** The project being updated; null when creating. */
  projectId: string | null;
  digest: string;
  now?: Date;
}

export function buildProjectMessage({
  action,
  network,
  stakeAddress,
  projectId,
  digest,
  now = new Date(),
}: ProjectMessageParts): string {
  return (
    `${MESSAGE_PREFIX} ${action} on ${network} for ${stakeAddress} at ${now.toISOString()}\n` +
    `project: ${projectId ?? 'new'} [${digest}]`
  );
}

export function parseProjectMessage(message: string): (ProjectMessageParts & { signedAt: string }) | null {
  const match = PROJECT_MESSAGE_RE.exec(message);
  if (!match) return null;
  const [, action, network, stakeAddress, signedAt, projectId, digest] = match;
  return {
    action: action as ProjectAction,
    network,
    stakeAddress,
    signedAt,
    projectId: projectId === 'new' ? null : projectId,
    digest,
  };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** 16-hex SHA-256 prefix over the canonical JSON of the signed fields. */
export async function projectDigest(input: ProjectInput): Promise<string> {
  const { name, description, website, logoUrl, tokenId, poolId, distribution } = input;
  const data = new TextEncoder().encode(
    canonical({ name, description, website, logoUrl, tokenId, poolId, distribution }),
  );
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}
