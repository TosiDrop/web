import { describe, expect, it, vi } from 'vitest';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock('@/api/client', () => ({ apiClient: { get: getMock } }));

import { fetchMarketPrices } from '../market.queries';

describe('fetchMarketPrices', () => {
  it('fetches every distinct unit in batches and merges the responses', async () => {
    getMock.mockImplementation(async (url: string) => {
      const units = new URL(`https://example.test${url}`).searchParams.get('units')?.split(',') ?? [];
      return { prices: Object.fromEntries(units.map((unit) => [unit, { source: 'index' }])) };
    });

    const units = Array.from({ length: 205 }, (_, index) => `unit-${index}`).concat(' unit-0 ');
    const result = await fetchMarketPrices(units);

    expect(getMock).toHaveBeenCalledTimes(3);
    expect(Object.keys(result)).toHaveLength(205);
    expect(result['unit-204']).toEqual({ source: 'index' });
    expect(getMock.mock.calls.every(([url]) => new URL(`https://example.test${url}`).searchParams.get('units')!.split(',').length <= 100)).toBe(true);
  });
});
