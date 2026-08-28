import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/analytics/hooks/usePlatformStats', () => ({
  usePlatformStats: () => ({ data: undefined, isLoading: true, error: null }),
}));
const poolsMock = vi.fn();
vi.mock('@/features/analytics/hooks/usePoolData', () => ({ usePoolData: () => poolsMock() }));

import AnalyticsPage from '../AnalyticsPage';

const ROW = {
  poolId: 'pool1a', ticker: 'TOSI', name: 'TosiDrop', delegators: 12, whitelisted: true,
  offerings: [{
    id: '20', token: 't', ticker: 'mTOSI', amountPerEpoch: 420, promise: true,
    audience: 'everyone', target: 'group_1', model: '0', minStakeAda: null, minAgeEpochs: null, stakeCapAda: null,
  }],
  withdrawals: 3, collectedFeesAda: 1.5,
};

describe('AnalyticsPage', () => {
  afterEach(cleanup);

  it('renders public sections and links to personal analytics', () => {
    poolsMock.mockReturnValue({
      data: {
        rows: [ROW, { ...ROW, poolId: 'pool1b', ticker: 'APEX', name: 'Apex', whitelisted: false, offerings: [] }],
        unavailable: [],
      },
      isLoading: false,
      error: null,
    });
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Public analytics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pool comparison' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Platform statistics' })).toBeInTheDocument();
    expect(screen.getByLabelText('Loading platform statistics')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open personal analytics' })).toHaveAttribute('href', '/profile?tab=analytics');

    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('mTOSI')).toBeInTheDocument();
    expect(screen.getByLabelText('Whitelisted')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter pools'), { target: { value: 'apex' } });
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.queryByText('TosiDrop')).not.toBeInTheDocument();
  });
});
