import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deploymentCacheKey,
  deploymentNetwork,
  vmConfig,
  vmConfigurationErrorResponse,
  vmGet,
  withCache,
} from '../vmClient';
import type { Env } from '../../types/env';

const { sdkGet, setApiToken, VmClient } = vi.hoisted(() => {
  const sdkGet = vi.fn();
  const setApiToken = vi.fn();
  const VmClient = vi.fn(function (this: { get: typeof sdkGet }, _baseUrl: string) {
    this.get = sdkGet;
  });
  return { sdkGet, setApiToken, VmClient };
});

vi.mock('vm-sdk', () => ({
  setApiToken,
  GET_FROM_VM: VmClient,
}));

const previewEnv = {
  VITE_NETWORK: 'preview',
  VITE_VM_API_KEY: 'preview-key',
  VM_WEB_PROFILES: {} as never,
} as Env;

describe('deploymentNetwork', () => {
  it('selects mainnet only from the deployment environment', () => {
    expect(deploymentNetwork({ ...previewEnv, VITE_NETWORK: 'mainnet' })).toBe('mainnet');
  });

  it.each([undefined, '', 'preview', 'MAINNET', 'invalid'])(
    'defaults %j to preview',
    (value) => {
      expect(deploymentNetwork({ ...previewEnv, VITE_NETWORK: value })).toBe('preview');
    },
  );
});

describe('vmConfig', () => {
  it('uses the preview VM default when Preview has no explicit base URL', () => {
    expect(vmConfig(previewEnv)).toEqual({
      baseUrl: 'https://vmprev.adaseal.eu',
      apiKey: 'preview-key',
    });
  });

  it('uses the deployment VM base URL and API key', () => {
    expect(
      vmConfig({
        ...previewEnv,
        VITE_NETWORK: 'mainnet',
        VM_BASE_URL: 'https://vm-mainnet.example',
        VITE_VM_API_KEY: 'mainnet-key',
      }),
    ).toEqual({
      baseUrl: 'https://vm-mainnet.example',
      apiKey: 'mainnet-key',
    });
  });

  it('fails closed when a Mainnet deployment has no explicit VM base URL', () => {
    expect(vmConfig({ ...previewEnv, VITE_NETWORK: 'mainnet' })).toBeNull();
  });

  it('rejects an empty API key on either deployment network', () => {
    expect(vmConfig({ ...previewEnv, VITE_VM_API_KEY: '' })).toBeNull();
    expect(
      vmConfig({
        ...previewEnv,
        VITE_NETWORK: 'mainnet',
        VM_BASE_URL: 'https://vm-mainnet.example',
        VITE_VM_API_KEY: ' ',
      }),
    ).toBeNull();
  });
});

describe('deploymentCacheKey', () => {
  it('isolates a shared cache by the deployment network', () => {
    expect(deploymentCacheKey(previewEnv, '__internal:pools_cache')).toBe(
      '__internal:pools_cache:preview',
    );
    expect(
      deploymentCacheKey(
        { ...previewEnv, VITE_NETWORK: 'mainnet' },
        '__internal:pools_cache',
      ),
    ).toBe('__internal:pools_cache:mainnet');
  });
});

describe('vmConfigurationErrorResponse', () => {
  it('returns a server configuration error without advertising another network', async () => {
    const res = vmConfigurationErrorResponse('https://tosidrop.io');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Server configuration error' });
  });
});

describe('vmGet', () => {
  beforeEach(() => {
    sdkGet.mockReset();
    setApiToken.mockReset();
    VmClient.mockClear();
  });

  it('uses vm-sdk with the deployment base URL, key, action, and params', async () => {
    sdkGet.mockResolvedValueOnce({ ok: true });
    const env = {
      ...previewEnv,
      VITE_NETWORK: 'mainnet',
      VM_BASE_URL: 'https://vm-mainnet.example',
      VITE_VM_API_KEY: 'mainnet-key',
    };

    await expect(
      vmGet(env, 'get_rewards', {
        staking_address: 'stake1x',
        token_id: undefined,
      }),
    ).resolves.toEqual({ ok: true });

    expect(setApiToken).toHaveBeenCalledWith('mainnet-key');
    expect(VmClient).toHaveBeenCalledWith('https://vm-mainnet.example');
    expect(sdkGet).toHaveBeenCalledWith(
      'get_rewards',
      {
        staking_address: 'stake1x',
        token_id: undefined,
      },
    );
  });

  it('refuses to call vm-sdk when deployment configuration is incomplete', async () => {
    await expect(
      vmGet({ ...previewEnv, VITE_NETWORK: 'mainnet' }, 'get_pools'),
    ).rejects.toThrow('vm_configuration_error');
    expect(sdkGet).not.toHaveBeenCalled();
  });
});

describe('withCache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('isolates edge-cache entries by the deployment network', async () => {
    const match = vi.fn(async (_request: Request): Promise<Response | undefined> => undefined);
    const put = vi.fn(async () => undefined);
    vi.stubGlobal('caches', { default: { match, put } });

    await withCache(
      new Request('https://tosidrop.io/api/getQueue'),
      { ...previewEnv, VITE_NETWORK: 'mainnet' },
      60,
      async () => ({ pending: 1 }),
    );

    const cacheRequest = match.mock.calls[0]?.[0] as Request;
    expect(new URL(cacheRequest.url).searchParams.get('__deployment_network')).toBe('mainnet');
  });
});
