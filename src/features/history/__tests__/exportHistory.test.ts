import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({ apiClient: { get: (...args: unknown[]) => getMock(...args) } }));

import { fetchAllHistory, historyCsvRows } from '../utils/exportHistory';

const ITEM = {
  rewardId: 'r1', token: 'lovelace', amount: '1500000', epoch: 500,
  deliveredOn: '1750000000', deliveredAt: 1750000000, withdrawalRequest: 'w1',
  receiptPriceUsd: 0.75, receiptPriceObservedAt: 1749999900, receiptPriceSource: 'index-a',
};

describe('claim history CSV', () => {
  beforeEach(() => { getMock.mockReset(); });

  it('fetches every indexed page instead of exporting just the visible page', async () => {
    getMock.mockResolvedValueOnce({ items: [ITEM], hasMore: true })
      .mockResolvedValueOnce({ items: [{ ...ITEM, rewardId: 'r2' }], hasMore: false });
    const items = await fetchAllHistory('stake_test1abc');
    expect(items).toHaveLength(2);
    expect(getMock).toHaveBeenNthCalledWith(2, '/api/history?staking_address=stake_test1abc&page=2&limit=100&order=desc');
  });

  it('exports the observed historical price and leaves missing prices empty', () => {
    const rows = historyCsvRows([ITEM, { ...ITEM, rewardId: 'r2', receiptPriceUsd: null }], {
      lovelace: { ticker: 'ADA', decimals: 6 },
    });
    expect(rows[1]).toContain(1.5);
    expect(rows[1]).toContain(1.125);
    expect(rows[2][6]).toBe('');
    expect(rows[2][7]).toBe('');
  });

  it('keeps raw units and omits estimated value when token decimals are unknown', () => {
    const rows = historyCsvRows([{ ...ITEM, token: 'unknown', amount: '123456' }], {});
    expect(rows[1][5]).toBe('');
    expect(rows[1][6]).toBe(0.75);
    expect(rows[1][7]).toBe('');
    expect(rows[1][10]).toBe('123456');
  });
});
