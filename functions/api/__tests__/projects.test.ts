import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../types/env';

const verifyMock = vi.fn();
vi.mock('../../services/verifyProjectSignature', () => ({
  verifyProjectSignature: (...args: unknown[]) => verifyMock(...args),
}));

import { onRequestGet, onRequestPost } from '../projects';
import { onRequestGet as getOne, onRequestPut } from '../projects/[id]';

const STAKE = 'stake1' + 'u'.repeat(40);
const ORIGIN = { Origin: 'http://localhost:5173' };

interface Call { sql: string; binds: unknown[] }

function fakeDb(opts: { first?: unknown[]; all?: unknown[] } = {}) {
  const calls: Call[] = [];
  const firsts = [...(opts.first ?? [])];
  const prepare = (sql: string) => ({
    bind(...b: unknown[]) {
      calls.push({ sql, binds: b });
      return this;
    },
    all: async () => ({ results: opts.all ?? [] }),
    first: async () => firsts.shift() ?? null,
    run: async () => ({}),
  });
  return { prepare, __calls: calls } as unknown as D1Database & { __calls: Call[] };
}

const ROW = {
  id: 'p1', network: 'preview', owner_address: STAKE, name: 'Tosi', description: null,
  website: 'https://tosidrop.io', logo_url: null, token_id: 'pol.6d544f5349', pool_id: null,
  distribution: '{"amountPerEpoch":"10","minStakeAda":"","expiryEpochs":2}',
  status: 'pending', created_at: '2026-08-20 00:00:00', updated_at: '2026-08-20 00:00:00',
  approved_at: null,
};

const PROJECT = { name: 'Tosi', tokenId: 'pol.6d544f5349', website: 'https://tosidrop.io' };
const SIGNED = { ownerAddress: STAKE, project: PROJECT, signature: 's', key: 'k', message: 'm' };

function env(db?: D1Database): Env {
  return { VITE_VM_API_KEY: 'k', VITE_NETWORK: 'preview', DB: db } as unknown as Env;
}
function ctx(req: Request, e: Env, params: Record<string, string> = {}) {
  return { request: req, env: e, params } as unknown as Parameters<typeof onRequestPut>[0];
}
const json = (url: string, method: string, body: unknown) =>
  new Request(url, { method, headers: { 'Content-Type': 'application/json', ...ORIGIN }, body: JSON.stringify(body) });

describe('/api/projects', () => {
  beforeEach(() => {
    verifyMock.mockReset();
    verifyMock.mockResolvedValue({ ok: true });
  });

  it('GET 400 without owner, degrades without DB', async () => {
    const r1 = await onRequestGet(ctx(new Request('https://x/api/projects', { headers: ORIGIN }), env()));
    expect(r1.status).toBe(400);
    const r2 = await onRequestGet(
      ctx(new Request(`https://x/api/projects?owner=${STAKE}`, { headers: ORIGIN }), env()),
    );
    expect(await r2.json()).toEqual({ projects: [], degraded: true });
  });

  it('GET lists camelCase projects scoped to the deployment network', async () => {
    const db = fakeDb({ all: [ROW] });
    const res = await onRequestGet(
      ctx(new Request(`https://x/api/projects?owner=${STAKE}`, { headers: ORIGIN }), env(db)),
    );
    const body = await res.json() as { projects: Array<Record<string, unknown>> };
    expect(body.projects[0]).toMatchObject({
      id: 'p1', ownerAddress: STAKE, name: 'Tosi', description: '', poolId: '',
      distribution: { amountPerEpoch: '10', minStakeAda: '', expiryEpochs: 2 },
      status: 'pending',
    });
    expect(db.__calls[0].binds).toEqual(['preview', STAKE]);
  });

  it('POST rejects invalid payloads before verifying', async () => {
    const bad = await onRequestPost(
      ctx(json('https://x/api/projects', 'POST', { ...SIGNED, project: { name: '' } }), env()),
    );
    expect(bad.status).toBe(400);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('POST 401 when the signature fails', async () => {
    verifyMock.mockResolvedValue({ ok: false, status: 401, reason: 'nope' });
    const res = await onRequestPost(ctx(json('https://x/api/projects', 'POST', SIGNED), env()));
    expect(res.status).toBe(401);
  });

  it('POST inserts a normalized row and returns 201', async () => {
    const db = fakeDb({ first: [{ n: 0 }] });
    const res = await onRequestPost(ctx(json('https://x/api/projects', 'POST', SIGNED), env(db)));
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string };
    expect(body.id).toMatch(/[0-9a-f-]{36}/);
    const insert = db.__calls.find((c) => c.sql.startsWith('INSERT'))!;
    expect(insert.binds.slice(1, 5)).toEqual(['preview', STAKE, 'Tosi', null]);
    expect(verifyMock.mock.calls[0][0]).toMatchObject({ stakeAddress: STAKE, project: { name: 'Tosi' } });
  });

  it('POST 409 over the per-owner limit', async () => {
    const db = fakeDb({ first: [{ n: 20 }] });
    const res = await onRequestPost(ctx(json('https://x/api/projects', 'POST', SIGNED), env(db)));
    expect(res.status).toBe(409);
  });

  it('GET /:id 404s when missing', async () => {
    const res = await getOne(
      ctx(new Request('https://x/api/projects/p1', { headers: ORIGIN }), env(fakeDb()), { id: 'p1' }),
    );
    expect(res.status).toBe(404);
  });

  it('PUT 403 for non-owners, 200 for owners', async () => {
    const other = fakeDb({ first: [{ owner_address: 'stake1other' }] });
    const r1 = await onRequestPut(
      ctx(json('https://x/api/projects/p1', 'PUT', SIGNED), env(other), { id: 'p1' }),
    );
    expect(r1.status).toBe(403);

    const mine = fakeDb({ first: [{ owner_address: STAKE }] });
    const r2 = await onRequestPut(
      ctx(json('https://x/api/projects/p1', 'PUT', SIGNED), env(mine), { id: 'p1' }),
    );
    expect(r2.status).toBe(200);
    const update = mine.__calls.find((c) => c.sql.startsWith('UPDATE'))!;
    expect(update.binds.slice(-2)).toEqual(['preview', 'p1']);
  });
});
