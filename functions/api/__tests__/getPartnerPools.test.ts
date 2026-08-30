import { bech32 } from 'bech32';
import { describe, expect, it } from 'vitest';
import type { Env } from '../../types/env';
import { onRequestGet, parsePartnerPoolIds } from '../getPartnerPools';

type Ctx = Parameters<typeof onRequestGet>[0];
const POOL_ID = bech32.encode('pool', bech32.toWords(new Uint8Array(28).fill(1)));

function ctx(partnerPoolIds?: string): Ctx {
  return {
    request: new Request('https://x/api/getPartnerPools', {
      headers: { Origin: 'http://localhost:5173' },
    }),
    env: { PARTNER_POOL_IDS: partnerPoolIds } as Env,
  } as unknown as Ctx;
}

describe('parsePartnerPoolIds', () => {
  it('trims and de-duplicates configured pool IDs', () => {
    expect(parsePartnerPoolIds(` ${POOL_ID},${POOL_ID} `)).toEqual([POOL_ID]);
  });

  it('returns an empty list when unset', () => {
    expect(parsePartnerPoolIds(undefined)).toEqual([]);
  });

  it('rejects malformed and non-pool bech32 IDs', () => {
    expect(() => parsePartnerPoolIds('not-a-pool-id')).toThrow('invalid_partner_pool_ids');
    const stake = bech32.encode('stake', bech32.toWords(new Uint8Array(29).fill(2)));
    expect(() => parsePartnerPoolIds(stake)).toThrow('invalid_partner_pool_ids');
  });
});

describe('GET /api/getPartnerPools', () => {
  it('returns configured partner pool IDs', async () => {
    const res = await onRequestGet(ctx(` ${POOL_ID} `));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([POOL_ID]);
  });

  it('returns a server error for invalid configuration', async () => {
    const res = await onRequestGet(ctx('not-a-pool-id'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Server configuration error' });
  });
});
