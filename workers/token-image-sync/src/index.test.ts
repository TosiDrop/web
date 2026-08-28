import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { vmGet } = vi.hoisted(() => ({ vmGet: vi.fn() }));
vi.mock('../../../functions/services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../functions/services/vmClient')>();
  return { ...actual, vmGet };
});

import worker from './index';

function env(overrides: Record<string, unknown> = {}) {
  return {
    VITE_NETWORK: 'preview',
    VITE_VM_API_KEY: 'preview-key',
    VM_WEB_PROFILES: {
      get: vi.fn(async () => null),
      put: vi.fn(async () => undefined),
    },
    TOKEN_IMAGES: {
      head: vi.fn(async () => null),
      put: vi.fn(async () => undefined),
    },
    ...overrides,
  };
}

describe('token image sync worker', () => {
  beforeEach(() => {
    vmGet.mockReset();
    vmGet.mockResolvedValue({});
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads tokens through vm-sdk using the deployment configuration', async () => {
    const workerEnv = env({
      VITE_NETWORK: 'mainnet',
      VM_BASE_URL: 'https://vm-mainnet.example',
      VITE_VM_API_KEY: 'mainnet-key',
    });
    let scheduled: Promise<unknown> | undefined;
    const ctx = {
      waitUntil: vi.fn((promise: Promise<unknown>) => {
        scheduled = promise;
      }),
    };

    await worker.scheduled({} as ScheduledEvent, workerEnv as never, ctx as never);
    await scheduled;

    expect(vmGet).toHaveBeenCalledWith(workerEnv, 'get_tokens');
  });

  it('fails closed when a Mainnet deployment has no VM base URL', async () => {
    const ctx = { waitUntil: vi.fn() };

    await worker.scheduled(
      {} as ScheduledEvent,
      env({ VITE_NETWORK: 'mainnet' }) as never,
      ctx as never,
    );

    expect(ctx.waitUntil).not.toHaveBeenCalled();
    expect(vmGet).not.toHaveBeenCalled();
  });
});
