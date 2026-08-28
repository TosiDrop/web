import { truncateHash } from '@/utils/format';
import type { Project } from '@/shared/projects';

export function describeDistribution(p: Pick<Project, 'distribution' | 'poolId'>, ticker: string) {
  const { amountPerEpoch, minStakeAda, expiryEpochs } = p.distribution;
  return [
    amountPerEpoch ? `${amountPerEpoch} ${ticker} / epoch` : 'No amount set',
    minStakeAda ? `min ${minStakeAda} ADA` : null,
    expiryEpochs > 0 ? `expires after ${expiryEpochs} epochs` : null,
    p.poolId ? `pool ${truncateHash(p.poolId, 9, 4)}` : 'any pool',
  ]
    .filter(Boolean)
    .join(' · ');
}
