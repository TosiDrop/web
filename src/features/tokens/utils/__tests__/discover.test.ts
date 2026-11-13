import { describe, expect, it } from 'vitest';
import type { PoolComparisonRow, VmDistribution } from '@/features/analytics/utils/poolComparison';
import type { Project } from '@/shared/projects';
import { discoverSources, sortTokens, tokenActivity } from '../discover';

const dist = (id: string, token: string, enabled: string, reached?: number): VmDistribution => ({
  id, token_id: token, amount: '1', pool_id: 'pool1x', enabled,
  last_results: reached === undefined ? undefined : `Successfuly distributed 10 of ${token} to ${reached} targets`,
});
const token = (name: string, tokenId: string) => ({ name, tokenId }) as Project;

describe('tokenActivity', () => {
  it('sums reach over enabled rules and keeps the newest id', () => {
    const activity = tokenActivity([
      dist('3', 'pol.aa', 't', 100),
      dist('9', 'pol.aa', 't', 50),
      dist('12', 'pol.aa', 'f', 999), // disabled: counts for recency only
      dist('4', 'POLBB', 't'), // no run yet
    ]);
    expect(activity.get('polaa')).toEqual({ reach: 150, newest: 12 });
    expect(activity.get('polbb')).toEqual({ reach: 0, newest: 4 });
  });
});

describe('sortTokens', () => {
  const tokens = [token('Bravo', 'pol.bb'), token('Alpha', 'pol.aa'), token('Charlie', 'pol.cc')];
  const activity = tokenActivity([dist('5', 'pol.aa', 't', 10), dist('8', 'pol.bb', 't', 500)]);
  const names = (sorted: Project[]) => sorted.map((t) => t.name);

  it('ranks by reach, then recency, then name', () => {
    expect(names(sortTokens(tokens, 'popular', activity))).toEqual(['Bravo', 'Alpha', 'Charlie']);
    expect(names(sortTokens(tokens, 'recent', activity))).toEqual(['Bravo', 'Alpha', 'Charlie']);
    expect(names(sortTokens(tokens, 'name', activity))).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });
});

describe('discoverSources', () => {
  it('lists pools and projects that distribute something', () => {
    const row = (kind: 'pool' | 'project', poolId: string, ticker: string, tokensOffered: string[]) =>
      ({ kind, poolId, ticker, name: `${ticker} name`, offerings: tokensOffered.map((t) => ({ token: t })) }) as PoolComparisonRow;
    const sources = discoverSources([
      row('pool', 'pool1a', 'AAA', ['pol.aa']),
      row('pool', 'pool1idle', 'IDLE', []),
      row('project', 'P_SYS', 'SYS', ['pol.bb', 'pol.cc']),
    ]);
    expect(sources.map((s) => [s.kind, s.label, [...s.tokens]])).toEqual([
      ['pool', 'AAA', ['polaa']],
      ['project', 'SYS name', ['polbb', 'polcc']],
    ]);
  });
});
