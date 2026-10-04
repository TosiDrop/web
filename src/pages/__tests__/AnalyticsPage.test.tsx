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
  kind: 'pool' as const,
  poolId: 'pool1a', ticker: 'TOSI', name: 'TosiDrop', delegators: 12, partner: true,
  offerings: [{
    id: '20', token: 't', ticker: 'mTOSI', amountPerEpoch: 420, promise: true,
    audience: 'everyone', target: 'group_1', model: '0', minStakeAda: null, minAgeEpochs: null, stakeCapAda: null,
  }],
};

describe('AnalyticsPage', () => {
  afterEach(cleanup);

  it('renders first-class analytics sections', () => {
    poolsMock.mockReturnValue({
      data: {
        rows: [ROW, { ...ROW, poolId: 'pool1b', ticker: 'APEX', name: 'Apex', partner: false, offerings: [] }],
        unavailable: [],
      },
      isLoading: false,
      error: null,
    });
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pool performance' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Platform pulse' })).toBeInTheDocument();
    expect(screen.getByLabelText('Loading platform statistics')).toBeInTheDocument();

    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
    expect(screen.getByText('mTOSI')).toBeInTheDocument();
    expect(screen.getByText('Partner')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter pools'), { target: { value: 'apex' } });
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(screen.getByText('APEX')).toBeInTheDocument();
    expect(screen.queryByLabelText('TOSI relative delegator count')).not.toBeInTheDocument();
  });
});
