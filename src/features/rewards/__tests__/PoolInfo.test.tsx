import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const poolsMock = vi.fn();
const partnerPoolsMock = vi.fn();
vi.mock('@/features/rewards/api/pools.queries', () => ({
  canonicalPoolId: (id: string) => id,
  usePools: () => poolsMock(),
  usePartnerPoolIds: () => partnerPoolsMock(),
}));

import { PoolInfo } from '../components/PoolInfo';

const POOL = { id: 'pool1abc', ticker: 'TOSI', name: 'TosiDrop', enabled: 't', logo: '' };

describe('PoolInfo', () => {
  afterEach(cleanup);
  beforeEach(() => {
    poolsMock.mockReturnValue({ data: { pool1abc: POOL }, isLoading: false, isError: false });
    partnerPoolsMock.mockReturnValue({ data: ['pool1abc'], isLoading: false, isError: false });
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

  it('renders pool metadata and partner status', () => {
    render(<PoolInfo poolId="pool1abc" />);
    expect(screen.getByText('TosiDrop')).toBeInTheDocument();
    expect(screen.getByText('[TOSI]')).toBeInTheDocument();
    expect(screen.getByText('Partner')).toBeInTheDocument();
  });

  it('flags unknown pools without a partner badge', () => {
    partnerPoolsMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<PoolInfo poolId="pool1zzz" />);
    expect(screen.getByText('Unknown pool')).toBeInTheDocument();
    expect(screen.queryByText('Partner')).not.toBeInTheDocument();
  });

  it('hides the badge until partner pools resolve', () => {
    partnerPoolsMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<PoolInfo poolId="pool1abc" />);
    expect(screen.queryByText('Partner')).not.toBeInTheDocument();
  });
});
