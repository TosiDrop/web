import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../types/env';

const verifyStakeMock = vi.fn();
vi.mock('../../services/verifyStakeSignature', () => ({
  verifyStakeSignature: (...args: unknown[]) => verifyStakeMock(...args),
}));

import { onRequestGet, onRequestPost } from '../tokenPreferences';

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
    request: new Request('https://example.com/api/tokenPreferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
      body: JSON.stringify(body),
    }),
    env: { VITE_VM_API_KEY: 'k', ...env } as Env,
  } as unknown as PostCtx;
}

const STAKE = 'stake1' + 'u'.repeat(40);

describe('GET /api/tokenPreferences', () => {
  it('400 when stakeAddress missing', async () => {
    const res = await onRequestGet(getCtx('https://x/api/tokenPreferences', {}));
    expect(res.status).toBe(400);
  });

  it('returns degraded empty lists when no DB', async () => {
    const res = await onRequestGet(getCtx(`https://x/api/tokenPreferences?stakeAddress=${STAKE}`, {}));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ favorites: [], dislikes: [], degraded: true });
  });

  it('partitions rows into favorites and dislikes', async () => {
    const db = fakeDb();
    db.__setSelect([
      { asset_id: 'a1', ticker: 'AAA', logo: '', kind: 'favorite' },
      { asset_id: 'z1', ticker: 'ZZZ', logo: '', kind: 'dislike' },
    ]);
    const res = await onRequestGet(getCtx(`https://x/api/tokenPreferences?stakeAddress=${STAKE}`, { DB: db }));
    const body = await res.json();
    expect(body).toEqual({
      favorites: [{ assetId: 'a1', ticker: 'AAA', logo: '' }],
      dislikes: [{ assetId: 'z1', ticker: 'ZZZ', logo: '' }],
    });
  });
});

describe('POST /api/tokenPreferences', () => {
  beforeEach(() => {
    verifyStakeMock.mockReset();
    verifyStakeMock.mockResolvedValue({ ok: true });
  });

  it('415 when not JSON', async () => {
    const ctx = {
      request: new Request('https://x/api/tokenPreferences', { method: 'POST', body: 'x' }),
      env: { VITE_VM_API_KEY: 'k' } as Env,
    } as unknown as PostCtx;
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(415);
  });

  it('400 when stakeAddress is not bech32', async () => {
    const res = await onRequestPost(postCtx({ stakeAddress: 'nope', favorites: [], dislikes: [] }, {}));
    expect(res.status).toBe(400);
  });

  it('400 when favorites is not an array', async () => {
    const res = await onRequestPost(postCtx({ stakeAddress: STAKE, favorites: 'x', dislikes: [] }, {}));
    expect(res.status).toBe(400);
  });

  it('400 when dislikes is not an array', async () => {
    const res = await onRequestPost(postCtx({ stakeAddress: STAKE, favorites: [], dislikes: 'x' }, {}));
    expect(res.status).toBe(400);
  });

  it('400 when an assetId appears in both lists', async () => {
    const res = await onRequestPost(postCtx({
      stakeAddress: STAKE,
      favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }],
      dislikes: [{ assetId: 'a1', ticker: 'A', logo: '' }],
      signature: 's', key: 'k', message: 'm',
    }, {}));
    expect(res.status).toBe(400);
  });

  it('401 when signature verification fails', async () => {
    verifyStakeMock.mockResolvedValue({ ok: false, status: 401, reason: 'bad' });
    const res = await onRequestPost(postCtx(
      { stakeAddress: STAKE, favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }], dislikes: [], signature: 's', key: 'k', message: 'm' },
      {},
    ));
    expect(res.status).toBe(401);
  });

  it('succeeds (degraded) with no DB after a valid signature', async () => {
    const res = await onRequestPost(postCtx(
      { stakeAddress: STAKE, favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }], dislikes: [], signature: 's', key: 'k', message: 'm' },
      {},
    ));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, degraded: true });
  });

  it('writes both kinds in one delete + insert batch', async () => {
    const db = fakeDb();
    const res = await onRequestPost(postCtx({
      stakeAddress: STAKE,
      favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }],
      dislikes: [{ assetId: 'z1', ticker: 'Z', logo: '' }, { assetId: 'z2', ticker: 'Y', logo: '' }],
      signature: 's', key: 'k', message: 'm',
    }, { DB: db }));
    expect(res.status).toBe(200);
    expect(db.batch).toHaveBeenCalledTimes(1);
    const statements = db.batch.mock.calls[0][0];
    expect(statements).toHaveLength(4); // 1 delete + 1 favorite + 2 dislikes
    expect(verifyStakeMock).toHaveBeenCalledWith(
      expect.objectContaining({ favorites: ['a1'], dislikes: ['z1', 'z2'] }),
    );
  });
});
