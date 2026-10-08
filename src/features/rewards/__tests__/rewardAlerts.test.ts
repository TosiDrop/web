import { describe, expect, it } from 'vitest';
import type { ClaimableToken } from '@/shared/rewards';
import { compareRewardSnapshots, rewardSnapshot, rewardSnapshotKey } from '../utils/rewardAlerts';

function reward(assetId: string, amount: number, premium = false): ClaimableToken {
  return { assetId, amount, premium, ticker: assetId, logo: '', decimals: 0, native: false };
}

describe('reward alerts', () => {
  it('counts token types once when regular and premium rewards share an asset', () => {
    expect(rewardSnapshot([reward('a', 2), reward('a', 3, true), reward('b', 1)])).toEqual([
      { assetId: 'a', amount: 5 },
      { assetId: 'b', amount: 1 },
    ]);
  });

  it('sets a baseline without announcing existing rewards on first observation', () => {
    expect(compareRewardSnapshots(null, rewardSnapshot([reward('a', 1)]))).toEqual({ newCount: 0, totalCount: 1 });
  });

  it('announces new or increased rewards once and ignores unchanged data', () => {
    const previous = rewardSnapshot([reward('a', 1)]);
    const current = rewardSnapshot([reward('a', 2), reward('b', 1)]);
    expect(compareRewardSnapshots(previous, current)).toEqual({ newCount: 2, totalCount: 2 });
    expect(compareRewardSnapshots(current, current)).toEqual({ newCount: 0, totalCount: 2 });
  });

  it('scopes stored baselines to network and wallet', () => {
    expect(rewardSnapshotKey('mainnet', 'stake1abc')).not.toBe(rewardSnapshotKey('preview', 'stake1abc'));
    expect(rewardSnapshotKey('preview', 'stake1abc')).not.toBe(rewardSnapshotKey('preview', 'stake1xyz'));
  });
});
