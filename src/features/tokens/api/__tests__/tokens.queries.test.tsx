import type { ReactNode } from 'react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({ apiClient: { get: (...args: unknown[]) => getMock(...args) } }));

import { usePublicTokens } from '../tokens.queries';

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client }, children);
}

describe('usePublicTokens', () => {
  beforeEach(() => {
    getMock.mockReset();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('keeps VM tokens visible when project storage is degraded', async () => {
    getMock.mockImplementation((path: string) => {
      if (path === '/api/projects') return Promise.resolve({ projects: [], degraded: true, scope: 'public' });
      return Promise.resolve({ 'policy.544f5349': { ticker: 'TOSI', decimals: 6, logo: 'https://img/tosi.png' } });
    });
    const { result } = renderHook(() => usePublicTokens(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.degraded).toBe(false);
    expect(result.current.data?.metadataDegraded).toBe(true);
    expect(result.current.data?.projects[0]).toMatchObject({ name: 'TOSI', tokenId: 'policy.544f5349', logoUrl: 'https://img/tosi.png' });
  });

  it('treats malformed project data as an empty project list', async () => {
    getMock.mockImplementation((path: string) => {
      if (path === '/api/projects') return Promise.resolve({ projects: {}, degraded: false, scope: 'public' });
      return Promise.resolve({ 'policy.544f5349': { ticker: 'TOSI', decimals: 6 } });
    });
    const { result } = renderHook(() => usePublicTokens(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.projects).toHaveLength(1);
  });

  it('leaves token metadata undefined when its request fails', async () => {
    getMock.mockImplementation((path: string) => {
      if (path === '/api/projects') return Promise.resolve({ projects: [{ tokenId: 'policy.544f5349' }], degraded: false, scope: 'public' });
      return Promise.reject(new Error('metadata unavailable'));
    });
    const { result } = renderHook(() => usePublicTokens(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.tokens).toBeUndefined();
    expect(result.current.data?.metadataDegraded).toBe(true);
  });
});
