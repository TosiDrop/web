import { describe, it, expect } from 'vitest';
import { pickDelegatedPool } from '../hooks/useDelegatedPool';

describe('pickDelegatedPool', () => {
  it('returns null without pool-sourced rows', () => {
    expect(pickDelegatedPool([])).toBeNull();
    expect(pickDelegatedPool([{ pool: 'project_tosidrop', epoch: 10 }])).toBeNull();
  });

  it('picks the pool from the latest epoch, skipping project sources', () => {
    expect(
      pickDelegatedPool([
        { pool: 'pool1old', epoch: 100 },
        { pool: 'project_tosidrop', epoch: 200 },
        { pool: 'pool1new', epoch: 150 },
        { pool: null, epoch: 300 },
      ]),
    ).toBe('pool1new');
  });
});
