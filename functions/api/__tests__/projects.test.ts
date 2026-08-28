import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../types/env';

const verifyMock = vi.fn();
vi.mock('../../services/verifyProjectSignature', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/verifyProjectSignature')>()),
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

const PROJECT = {
  name: 'Tosi',
  tokenId: 'pol.6d544f5349',
  website: 'https://tosidrop.io',
  distribution: { amountPerEpoch: '10', minStakeAda: '', expiryEpochs: 2 },
};
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
    // first(): no row for this signature yet, then the per-owner count.
    const db = fakeDb({ first: [null, { n: 0 }] });
    const res = await onRequestPost(ctx(json('https://x/api/projects', 'POST', SIGNED), env(db)));
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string };
    expect(body.id).toMatch(/[0-9a-f-]{36}/);
    const insert = db.__calls.find((c) => c.sql.startsWith('INSERT'))!;
    expect(insert.binds.slice(1, 5)).toEqual(['preview', STAKE, 'Tosi', null]);
    expect(insert.sql).toContain('signature_hash');
    expect(insert.binds[10]).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyMock.mock.calls[0][0]).toMatchObject({
      stakeAddress: STAKE,
      project: { name: 'Tosi' },
      action: 'create',
      projectId: null,
      network: 'preview',
    });
  });

  it('POST returns the existing project for a replayed signature instead of a duplicate', async () => {
    const db = fakeDb({ first: [{ id: 'p-existing' }] });
    const res = await onRequestPost(ctx(json('https://x/api/projects', 'POST', SIGNED), env(db)));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'p-existing' });
    expect(db.__calls.some((c) => c.sql.startsWith('INSERT'))).toBe(false);
  });

  it('POST 409 over the per-owner limit', async () => {
    const db = fakeDb({ first: [null, { n: 20 }] });
    const res = await onRequestPost(ctx(json('https://x/api/projects', 'POST', SIGNED), env(db)));
    expect(res.status).toBe(409);
  });

  it('POST and PUT fail with 503 when storage is unavailable, never a fake id', async () => {
    const post = await onRequestPost(ctx(json('https://x/api/projects', 'POST', SIGNED), env()));
    expect(post.status).toBe(503);
    const put = await onRequestPut(
      ctx(json('https://x/api/projects/p1', 'PUT', SIGNED), env(), { id: 'p1' }),
    );
    expect(put.status).toBe(503);
  });

  it('GET /:id 503s without storage and 404s when missing', async () => {
    const unavailable = await getOne(
      ctx(new Request('https://x/api/projects/p1', { headers: ORIGIN }), env(), { id: 'p1' }),
    );
    expect(unavailable.status).toBe(503);
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
    expect(verifyMock.mock.calls.at(-1)![0]).toMatchObject({
      action: 'update',
      projectId: 'p1',
      network: 'preview',
    });
  });

  it.each(['approved', 'rejected'])(
    'PUT by the owner sends a %s project back to review',
    async (status) => {
      const db = fakeDb({ first: [{ owner_address: STAKE, status }] });
      const res = await onRequestPut(
        ctx(json('https://x/api/projects/p1', 'PUT', SIGNED), env(db), { id: 'p1' }),
      );
      expect(await res.json()).toEqual({ id: 'p1', status: 'pending' });
      const update = db.__calls.find((c) => c.sql.startsWith('UPDATE'))!;
      expect(update.sql).toContain("status = 'pending'");
      expect(update.sql).toContain('approved_at = NULL');
    },
  );
});
