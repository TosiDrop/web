import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchRegistryLogo, registrySubject } from '../tokenRegistry';

const POLICY = '29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6';
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const registryJson = (value: unknown) => new Response(JSON.stringify({ subject: 'x', logo: { value } }), { status: 200 });

describe('registrySubject', () => {
  it('joins policy id and asset name hex', () => {
    expect(registrySubject(`${POLICY}.4d494e`)).toBe(`${POLICY}4d494e`);
    expect(registrySubject(`${POLICY.toUpperCase()}.4D494E`)).toBe(`${POLICY}4d494e`);
    expect(registrySubject(POLICY)).toBe(POLICY);
  });

  it('rejects ids that are not Cardano assets', () => {
    expect(registrySubject('pol.aaaa')).toBeNull();
    expect(registrySubject(`${POLICY}.4d4`)).toBeNull(); // odd-length name
    expect(registrySubject(`${POLICY}.${'00'.repeat(33)}`)).toBeNull(); // name over 32 bytes
  });
});

describe('fetchRegistryLogo', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('decodes a registered PNG from the network registry', async () => {
    const fetchMock = vi.fn(async () => registryJson(base64(PNG)));
    vi.stubGlobal('fetch', fetchMock);

    const bytes = await fetchRegistryLogo(`${POLICY}.4d494e`, 'mainnet', 1024);

    expect(new Uint8Array(bytes!)).toEqual(PNG);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://tokens.cardano.org/metadata/${POLICY}4d494e/properties/logo`,
      expect.anything(),
    );
    await fetchRegistryLogo(`${POLICY}.4d494e`, 'preview', 1024);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `https://metadata.world.dev.cardano.org/metadata/${POLICY}4d494e/properties/logo`,
      expect.anything(),
    );
  });

  it('returns null for unregistered, non-PNG, or oversized logos', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    expect(await fetchRegistryLogo(`${POLICY}.4d494e`, 'mainnet', 1024)).toBeNull();

    vi.stubGlobal('fetch', vi.fn(async () => registryJson(base64(new Uint8Array([1, 2, 3])))));
    expect(await fetchRegistryLogo(`${POLICY}.4d494e`, 'mainnet', 1024)).toBeNull();

    vi.stubGlobal('fetch', vi.fn(async () => registryJson(base64(PNG))));
    expect(await fetchRegistryLogo(`${POLICY}.4d494e`, 'mainnet', 4)).toBeNull();
  });

  it('never calls the registry for ids that are not assets', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchRegistryLogo('pol.aaaa', 'mainnet', 1024)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
