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
      new Response(JSON.stringify([{ asset_policy: 'policy', quantity: '1' }]), { status: 200 }),
    );
    const client = new KoiosClient({ VITE_NETWORK: 'preview' });

    await expect(client.accountAssets('stake_test1example')).rejects.toThrow('incomplete asset row');
  });
});
