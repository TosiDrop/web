import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const hookMock = vi.fn();
vi.mock('../hooks/usePlatformStats', () => ({ usePlatformStats: () => hookMock() }));

import { PlatformStats } from '../components/PlatformStats';
import { shortUptime } from '../utils/uptime';

const STATS = {
  backend_up: true, ntds_up: false, pending_tx: 2, pending_rewards: 11446, pending_promises: 37491,
  tracked_stake: 92_012_021_836_945, tracked_delegators: 1164, delivered_rewards: 5_161_549,
  pending_withdrawals: 0, processed_withdrawals: 19966, failed_withdrawals: 4,
  uptime: '376 days, 19 hours, 12 minutes, 28 seconds', uptime_ntds: '1 day, 2 hours', epoch: 1216,
};

describe('PlatformStats', () => {
  afterEach(cleanup);

  it('shortens uptime strings', () => {
    expect(shortUptime(STATS.uptime)).toBe('376d 19h');
    expect(shortUptime('unknown')).toBe('unknown');
  });

  it('renders the system-info metrics', () => {
    hookMock.mockReturnValue({ data: STATS, isLoading: false, error: null });
    render(<PlatformStats />);
    expect(screen.getByText('5,161,549')).toBeInTheDocument();
    expect(screen.getByText('1,164')).toBeInTheDocument();
    expect(screen.getByText('19,970')).toBeInTheDocument();
    expect(screen.getByText('19,966 processed · 4 failed')).toBeInTheDocument();
    expect(screen.getByText('Backend up')).toBeInTheDocument();
    expect(screen.getByText('NTDS down')).toBeInTheDocument();
    expect(screen.getByText('376d 19h')).toBeInTheDocument();
  });

  it('shows an error state', () => {
    hookMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('boom') });
    render(<PlatformStats />);
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });
});
