import { afterEach, describe, expect, it, vi } from 'vitest';
import { KoiosClient, koiosConfig } from '../koiosClient';

describe('koiosConfig', () => {
  it('uses the configured mainnet endpoint and optional API key', () => {
    expect(
      koiosConfig({
        VITE_NETWORK: 'mainnet',
        KOIOS_BASE_URL_MAINNET: 'https://koios.internal/api/v1/',
        KOIOS_API_KEY_MAINNET: 'secret',
      }),
    ).toEqual({
      network: 'mainnet',
      baseUrl: 'https://koios.internal/api/v1',
      apiKey: 'secret',
    });
  });

  it('falls back to the public preview endpoint when no override is set', () => {
    expect(koiosConfig({ VITE_NETWORK: 'preview' })).toMatchObject({
      network: 'preview',
      baseUrl: 'https://preview.koios.rest/api/v1',
    });
  });

  it('rejects an HTTP endpoint when bearer authentication is configured', () => {
    expect(() => koiosConfig({
      VITE_NETWORK: 'preview',
      KOIOS_BASE_URL_PREVIEW: 'http://koios.internal',
      KOIOS_API_KEY_PREVIEW: 'secret',
    })).toThrow('HTTPS');
  });
});

describe('KoiosClient', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends requests to the configured endpoint without exposing configuration in the body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ total_balance: '42' }]), { status: 200 }),
    );
    const client = new KoiosClient({
      VITE_NETWORK: 'mainnet',
      KOIOS_BASE_URL_MAINNET: 'https://koios.internal',
      KOIOS_API_KEY_MAINNET: 'secret',
    });

    await expect(client.accountInfo('stake1example')).resolves.toEqual([{ total_balance: '42' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://koios.internal/api/v1/account_info',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
        body: JSON.stringify({ _stake_addresses: ['stake1example'] }),
      }),
    );
  });

  it('rejects incomplete account asset rows', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ policy_id: 'abababababababababababababababababababababababababababab', quantity: '1' }]), { status: 200 }),
    );
    const client = new KoiosClient({ VITE_NETWORK: 'preview' });

    await expect(client.accountAssets('stake_test1example')).rejects.toThrow('incomplete asset row');
  });

  it('rejects incomplete asset metadata rows', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ policy_id: 'abababababababababababababababababababababababababababab' }]), { status: 200 }),
    );
    const client = new KoiosClient({ VITE_NETWORK: 'preview' });

    await expect(client.assetInfo(['abababababababababababababababababababababababababababab'])).rejects.toThrow('asset_info returned an incomplete asset row');
  });

  it('uses policy and asset-name pairs for bulk metadata, including an empty asset name', async () => {
    const policy = 'ab'.repeat(28);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const body = JSON.parse(typeof init?.body === 'string' ? init.body : '{}');
      return body._asset_list?.[0]?.[0] === policy && body._asset_list?.[0]?.[1] === ''
        ? new Response(JSON.stringify([{ policy_id: policy, asset_name: '', token_registry_metadata: { ticker: 'TOKEN', decimals: 6 } }]))
        : new Response('invalid asset list', { status: 400 });
    });
    const client = new KoiosClient({ VITE_NETWORK: 'preview' });
    const rows = await client.assetInfo([policy]);
    expect(rows[0].token_registry_metadata?.ticker).toBe('TOKEN');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed reward amounts instead of reporting a zero earned total', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([
      { earned_epoch: 500, amount: 'invalid', pool_id_bech32: null, type: 'member' },
    ])));
    await expect(new KoiosClient({ VITE_NETWORK: 'preview' }).accountRewards('stake_test1example')).rejects.toThrow('amount');
  });

  it('rejects nonnumeric token quantities before they can become portfolio values', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([
      { policy_id: 'ab'.repeat(28), asset_name: '', quantity: '-1', decimals: 0 },
    ])));
    await expect(new KoiosClient({ VITE_NETWORK: 'preview' }).accountAssets('stake_test1example')).rejects.toThrow('quantity');
  });

  it.each(['account_reward_history', 'account_assets'])('reads every page of %s with stable ordering', async (endpoint) => {
    const row = endpoint === 'account_assets'
      ? { policy_id: 'ab'.repeat(28), asset_name: '', quantity: '1' }
      : { earned_epoch: 500, amount: '100', type: 'member' };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      expect(url.searchParams.get('order')).toBeTruthy();
      return new Response(JSON.stringify(url.searchParams.get('offset') === '1000' ? [row] : Array.from({ length: 1000 }, () => row)));
    });
    const client = new KoiosClient({ VITE_NETWORK: 'preview' });
    const rows = endpoint === 'account_assets' ? await client.accountAssets('stake_test1example') : await client.accountRewards('stake_test1example');
    expect(rows).toHaveLength(1001);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('batches metadata within the public request-body limit', async () => {
    const units = Array.from({ length: 100 }, (_, index) => `${index.toString(16).padStart(56, '0')}${'ab'.repeat(32)}`);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const body = typeof init?.body === 'string' ? init.body : '';
      if (new TextEncoder().encode(body).length > 1000) return new Response('body too large', { status: 413 });
      const pairs = JSON.parse(body)._asset_list as string[][];
      return new Response(JSON.stringify(pairs.map(([policy_id, asset_name]) => ({ policy_id, asset_name }))));
    });
    const rows = await new KoiosClient({ VITE_NETWORK: 'preview' }).assetInfo(units);
    expect(rows).toHaveLength(100);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it('fails the full rewards read when a later page is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(Array.from({ length: 1000 }, () => ({ earned_epoch: 500, amount: '100' })))))
      .mockResolvedValueOnce(new Response('page unavailable', { status: 400 }));
    await expect(new KoiosClient({ VITE_NETWORK: 'preview' }).accountRewards('stake_test1example')).rejects.toThrow('failed (400)');
  });
});
