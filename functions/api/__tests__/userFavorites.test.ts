import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../types/env';

const verifyStakeMock = vi.fn();
vi.mock('../../services/verifyStakeSignature', () => ({
  verifyStakeSignature: (...args: unknown[]) => verifyStakeMock(...args),
}));

import { onRequestGet, onRequestPost } from '../userFavorites';

type GetCtx = Parameters<typeof onRequestGet>[0];
type PostCtx = Parameters<typeof onRequestPost>[0];

function fakeDb() {
  const calls: { sql: string; binds: unknown[] }[] = [];
  let selectRows: unknown[] = [];
  const prepare = (sql: string) => {
    const stmt = {
      _binds: [] as unknown[],
      bind(...b: unknown[]) {
        this._binds = b;
        calls.push({ sql, binds: b });
        return this;
      },
      all: async () => ({ results: selectRows }),
      run: async () => ({}),
    };
    return stmt;
  };
  const db = {
    prepare,
    batch: vi.fn(async () => []),
    __setSelect: (rows: unknown[]) => {
      selectRows = rows;
    },
    __calls: calls,
  };
  return db as unknown as D1Database & {
    __setSelect: (r: unknown[]) => void;
    __calls: typeof calls;
    batch: ReturnType<typeof vi.fn>;
  };
}

function getCtx(url: string, env: Partial<Env>): GetCtx {
  return {
    request: new Request(url, { headers: { Origin: 'http://localhost:5173' } }),
    env: { VITE_VM_API_KEY: 'k', ...env } as Env,
  } as unknown as GetCtx;
}

function postCtx(body: unknown, env: Partial<Env>): PostCtx {
  return {
    request: new Request('https://example.com/api/userFavorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
      body: JSON.stringify(body),
    }),
    env: { VITE_VM_API_KEY: 'k', ...env } as Env,
  } as unknown as PostCtx;
}

const STAKE = 'stake1' + 'u'.repeat(40);

describe('GET /api/userFavorites', () => {
  it('400 when stakeAddress missing', async () => {
    const res = await onRequestGet(getCtx('https://x/api/userFavorites', {}));
    expect(res.status).toBe(400);
  });

  it('returns degraded empty list when no DB', async () => {
    const res = await onRequestGet(getCtx(`https://x/api/userFavorites?stakeAddress=${STAKE}`, {}));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ favorites: [], degraded: true });
  });

  it('maps rows to camelCase favorites ordered by query', async () => {
    const db = fakeDb();
    db.__setSelect([{ asset_id: 'a1', ticker: 'AAA', logo: 'http://l/a' }]);
    const res = await onRequestGet(getCtx(`https://x/api/userFavorites?stakeAddress=${STAKE}`, { DB: db }));
    const body = await res.json();
    expect(body).toEqual({ favorites: [{ assetId: 'a1', ticker: 'AAA', logo: 'http://l/a' }] });
  });
});

describe('POST /api/userFavorites', () => {
  beforeEach(() => {
    verifyStakeMock.mockReset();
    verifyStakeMock.mockResolvedValue({ ok: true });
  });

  it('415 when not JSON', async () => {
    const ctx = {
      request: new Request('https://x/api/userFavorites', { method: 'POST', body: 'x' }),
      env: { VITE_VM_API_KEY: 'k' } as Env,
    } as unknown as PostCtx;
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(415);
  });

  it('400 when stakeAddress is not bech32', async () => {
    const res = await onRequestPost(postCtx({ stakeAddress: 'nope', favorites: [] }, {}));
    expect(res.status).toBe(400);
  });

  it('400 when favorites is not an array', async () => {
    const res = await onRequestPost(postCtx({ stakeAddress: STAKE, favorites: 'x' }, {}));
    expect(res.status).toBe(400);
  });

  it('401 when signature verification fails', async () => {
    verifyStakeMock.mockResolvedValue({ ok: false, status: 401, reason: 'bad' });
    const res = await onRequestPost(postCtx(
      { stakeAddress: STAKE, favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }], signature: 's', key: 'k', message: 'm' },
      {},
    ));
    expect(res.status).toBe(401);
  });

  it('succeeds (degraded) with no DB after a valid signature', async () => {
    const res = await onRequestPost(postCtx(
      { stakeAddress: STAKE, favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }], signature: 's', key: 'k', message: 'm' },
      {},
    ));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, degraded: true });
  });

  it('replaces the set via a delete + insert batch when DB present', async () => {
    const db = fakeDb();
    const res = await onRequestPost(postCtx(
      {
        stakeAddress: STAKE,
        favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }, { assetId: 'a2', ticker: 'B', logo: '' }],
        signature: 's', key: 'k', message: 'm',
      },
      { DB: db },
    ));
    expect(res.status).toBe(200);
    expect(db.batch).toHaveBeenCalledTimes(1);
    const statements = db.batch.mock.calls[0][0];
    expect(statements).toHaveLength(3); // 1 delete + 2 inserts
    expect(verifyStakeMock).toHaveBeenCalledWith(expect.objectContaining({ favorites: ['a1', 'a2'] }));
  });
});
