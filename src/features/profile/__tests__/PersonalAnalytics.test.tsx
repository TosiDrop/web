import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWalletStore } from '@/store/wallet-state';

const hookMock = vi.fn();
vi.mock('../hooks/usePersonalAnalytics', () => ({
  usePersonalAnalytics: (...args: unknown[]) => hookMock(...args),
}));

vi.mock('recharts', () => {
  const Box = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Chart = () => <div />;
  return {
    ResponsiveContainer: Box,
    AreaChart: Chart,
    Area: Chart,
    BarChart: Chart,
    Bar: Chart,
    PieChart: Chart,
    Pie: Chart,
    Cell: Chart,
    CartesianGrid: Chart,
    XAxis: Chart,
    YAxis: Chart,
    Tooltip: Chart,
  };
});

import { PersonalAnalytics } from '../components/PersonalAnalytics';

const DATA = {
  degraded: false,
  feesUnavailable: false,
  summary: {
    totalClaims: 4,
    distinctTokens: 2,
    totalFeesAda: 1.25,
    activeSince: new Date('2026-05-01T00:00:00Z'),
  },
  claimsByMonth: [
    { month: '2026-05', label: 'May 2026', claims: 1 },
    { month: '2026-06', label: 'Jun 2026', claims: 3 },
  ],
  seriesByToken: {
    lovelace: {
      token: 'lovelace',
      ticker: 'ADA',
      points: [
        { month: '2026-05', label: 'May 2026', amount: 1, cumulative: 1 },
        { month: '2026-06', label: 'Jun 2026', amount: 2.5, cumulative: 3.5 },
      ],
    },
    token1: {
      token: 'token1',
      ticker: 'TOSI',
      points: [
        { month: '2026-06', label: 'Jun 2026', amount: 8, cumulative: 8 },
      ],
    },
  },
  defaultToken: 'lovelace',
  tokenMix: [
    { token: 'lovelace', ticker: 'ADA', rewards: 3 },
    { token: 'token1', ticker: 'TOSI', rewards: 1 },
  ],
};

describe('PersonalAnalytics', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    hookMock.mockReset();
    useWalletStore.setState({
      stakeAddress: 'stake_test1analytics',
      connected: true,
    });
  });

  it('asks for a wallet connection when no stake address is available', () => {
    useWalletStore.setState({ stakeAddress: null, connected: false });
    hookMock.mockReturnValue({ data: undefined, isLoading: false, error: null });

    render(<PersonalAnalytics />);

    expect(screen.getByText('Connect a wallet to see your claim trends.')).toBeInTheDocument();
  });

  it('renders a deliberate loading state', () => {
    hookMock.mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(<PersonalAnalytics />);

    expect(screen.getByLabelText('Loading personal analytics')).toBeInTheDocument();
  });

  it('shows an actionable error state', () => {
    hookMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('analytics unavailable'),
    });

    render(<PersonalAnalytics />);

    expect(screen.getByText("Couldn't load personal analytics")).toBeInTheDocument();
    expect(screen.getByText('analytics unavailable')).toBeInTheDocument();
  });

  it('shows an empty state instead of zero-filled charts', () => {
    hookMock.mockReturnValue({
      data: {
        ...DATA,
        summary: { ...DATA.summary, totalClaims: 0 },
        claimsByMonth: [],
        seriesByToken: {},
        defaultToken: null,
        tokenMix: [],
      },
      isLoading: false,
      error: null,
    });

    render(<PersonalAnalytics />);

    expect(screen.getByText('Your first claim starts the timeline.')).toBeInTheDocument();
  });

  it('renders requested metrics and switches the cumulative token series', () => {
    hookMock.mockReturnValue({ data: DATA, isLoading: false, error: null });

    render(<PersonalAnalytics />);

    expect(within(screen.getByLabelText('Claim summary')).getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2 token types')).toBeInTheDocument();
    expect(screen.getByText('1.25 ADA')).toBeInTheDocument();
    expect(screen.getByText('May 1, 2026')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reward accumulation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Claim frequency' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tokens claimed' })).toBeInTheDocument();

    const selector = screen.getByLabelText('Reward token');
    expect(selector).toHaveValue('lovelace');
    fireEvent.change(selector, { target: { value: 'token1' } });
    expect(selector).toHaveValue('token1');
  });
});
