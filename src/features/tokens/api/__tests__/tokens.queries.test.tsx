import type { ReactNode } from 'react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({ apiClient: { get: (...args: unknown[]) => getMock(...args) } }));

import { usePublicTokens } from '../tokens.queries';

describe('usePublicTokens', () => {
  beforeEach(() => getMock.mockReset());

  it('keeps VM tokens visible when project storage is degraded', async () => {
    getMock.mockImplementation((path: string) => {
      if (path === '/api/projects') return Promise.resolve({ projects: [], degraded: true, scope: 'public' });
      return Promise.resolve({ 'policy.544f5349': { ticker: 'TOSI', decimals: 6, logo: 'https://img/tosi.png' } });
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(() => usePublicTokens(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.degraded).toBe(false);
    expect(result.current.data?.metadataDegraded).toBe(true);
    expect(result.current.data?.projects[0]).toMatchObject({ name: 'TOSI', tokenId: 'policy.544f5349', logoUrl: 'https://img/tosi.png' });
  });
});
