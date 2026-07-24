import { describe, expect, it } from 'vitest';
import { onRequestGet } from '../networks';
import type { Env } from '../../types/env';

const baseEnv = { VITE_VM_API_KEY: 'k', VM_WEB_PROFILES: {} as never } as Env;

function ctx(env: Env) {
  return {
    request: new Request('https://x/api/networks'),
    env,
  } as unknown as Parameters<typeof onRequestGet>[0];
}

describe('GET /api/networks', () => {
  it('reports preview-only under legacy env', async () => {
    const res = await onRequestGet(ctx(baseEnv));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ networks: { mainnet: false, preview: true } });
  });
  it('reports mainnet when configured', async () => {
    const env = { ...baseEnv, VM_BASE_URL_MAINNET: 'https://vm.example', VM_API_KEY_MAINNET: 'mk' };
    const res = await onRequestGet(ctx(env));
    expect(await res.json()).toEqual({ networks: { mainnet: true, preview: true } });
  });
});
