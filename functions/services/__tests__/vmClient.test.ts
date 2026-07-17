import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resolveNetwork,
  vmConfigFor,
  networksAvailable,
  netCacheKey,
  vmFetch,
} from '../vmClient';
import type { Env } from '../../types/env';

const baseEnv = { VITE_VM_API_KEY: 'legacy-key', VM_WEB_PROFILES: {} as never } as Env;

function req(url: string): Request {
  return new Request(url);
}

describe('resolveNetwork', () => {
  it('reads mainnet from the query param', () => {
    expect(resolveNetwork(req('https://x/api/getPools?network=mainnet'))).toBe('mainnet');
  });
  it('defaults to preview when absent', () => {
    expect(resolveNetwork(req('https://x/api/getPools'))).toBe('preview');
  });
  it('defaults to preview on garbage values', () => {
    expect(resolveNetwork(req('https://x/api/getPools?network=devnet'))).toBe('preview');
  });
});

describe('vmConfigFor', () => {
  it('preview falls back to legacy VM_BASE_URL and VITE_VM_API_KEY', () => {
    const env = { ...baseEnv, VM_BASE_URL: 'https://legacy.example' };
    expect(vmConfigFor(env, 'preview')).toEqual({
      baseUrl: 'https://legacy.example',
      apiKey: 'legacy-key',
    });
  });
  it('preview prefers the dedicated vars', () => {
    const env = {
      ...baseEnv,
      VM_BASE_URL_PREVIEW: 'https://prev.example',
      VM_API_KEY_PREVIEW: 'prev-key',
    };
    expect(vmConfigFor(env, 'preview')).toEqual({
      baseUrl: 'https://prev.example',
      apiKey: 'prev-key',
    });
  });
  it('mainnet requires both dedicated vars', () => {
    expect(vmConfigFor({ ...baseEnv, VM_BASE_URL_MAINNET: 'https://vm.example' }, 'mainnet')).toBeNull();
    expect(vmConfigFor({ ...baseEnv, VM_API_KEY_MAINNET: 'main-key' }, 'mainnet')).toBeNull();
    expect(
      vmConfigFor(
        { ...baseEnv, VM_BASE_URL_MAINNET: 'https://vm.example', VM_API_KEY_MAINNET: 'main-key' },
        'mainnet',
      ),
    ).toEqual({ baseUrl: 'https://vm.example', apiKey: 'main-key' });
  });
  it('mainnet never falls back to the preview key', () => {
    const env = { ...baseEnv, VM_BASE_URL_MAINNET: 'https://vm.example' };
    expect(vmConfigFor(env, 'mainnet')).toBeNull();
  });
});

describe('networksAvailable', () => {
  it('reports preview-only under legacy config', () => {
    expect(networksAvailable(baseEnv)).toEqual({ mainnet: false, preview: true });
  });
  it('reports mainnet when fully configured', () => {
    const env = { ...baseEnv, VM_BASE_URL_MAINNET: 'https://vm.example', VM_API_KEY_MAINNET: 'k' };
    expect(networksAvailable(env)).toEqual({ mainnet: true, preview: true });
  });
});

describe('netCacheKey', () => {
  it('suffixes with the network', () => {
    expect(netCacheKey('__internal:pools_cache', 'mainnet')).toBe('__internal:pools_cache:mainnet');
  });
});

describe('vmFetch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds the VM URL with action and params, skipping undefined', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const env = { ...baseEnv, VM_BASE_URL_PREVIEW: 'https://prev.example', VM_API_KEY_PREVIEW: 'pk' };
    await vmFetch(env, 'preview', 'get_rewards', { staking_address: 'stake1x', token_id: undefined });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://prev.example/api.php?action=get_rewards&staking_address=stake1x');
    expect((init.headers as Record<string, string>)['X-API-Token']).toBe('pk');
  });

  it('throws network_unavailable for unconfigured mainnet', async () => {
    await expect(vmFetch(baseEnv, 'mainnet', 'get_pools')).rejects.toThrow('network_unavailable');
  });

  it('throws on non-OK VM responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 502, statusText: 'Bad Gateway' })));
    await expect(vmFetch(baseEnv, 'preview', 'get_pools')).rejects.toThrow('VM API 502');
  });
});
