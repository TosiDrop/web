import {
  EMPTY_DISTRIBUTION,
  type DistributionConfig,
  type Project,
  type ProjectStatus,
} from '../../src/shared/projects';

export interface ProjectRow {
  id: string;
  network: string;
  owner_address: string;
  name: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  token_id: string;
  pool_id: string | null;
  distribution: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

export const PROJECT_COLUMNS =
  'id, network, owner_address, name, description, website, logo_url, token_id, pool_id, ' +
  'distribution, status, created_at, updated_at, approved_at';

function parseDistribution(raw: string | null): DistributionConfig {
  if (!raw) return EMPTY_DISTRIBUTION;
  try {
    return { ...EMPTY_DISTRIBUTION, ...(JSON.parse(raw) as Partial<DistributionConfig>) };
  } catch {
    return EMPTY_DISTRIBUTION;
  }
}

export function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    network: row.network,
    ownerAddress: row.owner_address,
    name: row.name,
    description: row.description ?? '',
    website: row.website ?? '',
    logoUrl: row.logo_url ?? '',
    tokenId: row.token_id,
    poolId: row.pool_id ?? '',
    distribution: parseDistribution(row.distribution),
    status: row.status as ProjectStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
  };
}
