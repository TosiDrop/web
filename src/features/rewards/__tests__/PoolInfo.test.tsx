import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const poolsMock = vi.fn();
const whitelistMock = vi.fn();
vi.mock('@/features/rewards/api/pools.queries', () => ({
  usePools: () => poolsMock(),
  useWhitelist: () => whitelistMock(),
}));

import { PoolInfo } from '../components/PoolInfo';

const POOL = { id: 'pool1abc', ticker: 'TOSI', name: 'TosiDrop', enabled: 't', logo: '' };

describe('PoolInfo', () => {
  afterEach(cleanup);
  beforeEach(() => {
    poolsMock.mockReturnValue({ data: { pool1abc: POOL }, isLoading: false, isError: false });
    whitelistMock.mockReturnValue({ data: new Set(['pool1abc']) });
  });

  it('shows an empty state without a pool', () => {
    render(<PoolInfo poolId={null} />);
    expect(screen.getByText('No delegated pool detected.')).toBeInTheDocument();
  });

  it('renders pool metadata and whitelist status', () => {
    render(<PoolInfo poolId="pool1abc" />);
    expect(screen.getByText('TosiDrop')).toBeInTheDocument();
    expect(screen.getByText('[TOSI]')).toBeInTheDocument();
    expect(screen.getByText('Whitelisted')).toBeInTheDocument();
  });

  it('flags unknown and non-whitelisted pools', () => {
    whitelistMock.mockReturnValue({ data: new Set() });
    render(<PoolInfo poolId="pool1zzz" />);
    expect(screen.getByText('Unknown pool')).toBeInTheDocument();
    expect(screen.getByText('Not whitelisted')).toBeInTheDocument();
  });

  it('hides the badge until the whitelist resolves', () => {
    whitelistMock.mockReturnValue({ data: undefined });
    render(<PoolInfo poolId="pool1abc" />);
    expect(screen.queryByText(/whitelisted/i)).not.toBeInTheDocument();
  });
});
