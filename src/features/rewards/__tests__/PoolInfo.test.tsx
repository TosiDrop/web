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
    whitelistMock.mockReturnValue({ data: new Set(['pool1abc']), isLoading: false, isError: false });
  });

  it('shows an empty state for a confirmed non-delegating account', () => {
    render(<PoolInfo poolId={null} />);
    expect(screen.getByText("This stake address isn't delegated to a pool.")).toBeInTheDocument();
  });

  it('renders a failed delegation lookup separately from no delegation', () => {
    render(<PoolInfo poolId={null} error={new Error('Failed to look up delegation')} />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't look up your delegation.");
    expect(screen.getByText('Failed to look up delegation')).toBeInTheDocument();
    expect(screen.queryByText(/isn't delegated/)).not.toBeInTheDocument();
  });

  it('renders pool metadata and whitelist status', () => {
    render(<PoolInfo poolId="pool1abc" />);
    expect(screen.getByText('TosiDrop')).toBeInTheDocument();
    expect(screen.getByText('[TOSI]')).toBeInTheDocument();
    expect(screen.getByText('Whitelisted')).toBeInTheDocument();
  });

  it('flags unknown and non-whitelisted pools', () => {
    whitelistMock.mockReturnValue({ data: new Set(), isLoading: false, isError: false });
    render(<PoolInfo poolId="pool1zzz" />);
    expect(screen.getByText('Unknown pool')).toBeInTheDocument();
    expect(screen.getByText('Not whitelisted')).toBeInTheDocument();
  });

  it('hides the badge until the whitelist resolves', () => {
    whitelistMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<PoolInfo poolId="pool1abc" />);
    expect(screen.queryByText(/whitelisted/i)).not.toBeInTheDocument();
  });

  it('says the whitelist is unavailable when that query fails', () => {
    whitelistMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<PoolInfo poolId="pool1abc" />);
    expect(screen.getByText('Whitelist unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Not whitelisted')).not.toBeInTheDocument();
  });
});
