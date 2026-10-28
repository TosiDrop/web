import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const enable = vi.fn();
vi.mock('../../hooks/useRewardAlerts', () => ({
  useRewardAlerts: () => ({
    count: 2, isLoading: false, error: null, browserEnabled: false, browserError: null,
    enableBrowserAlerts: enable, disableBrowserAlerts: vi.fn(),
  }),
}));

import { RewardAlertsButton } from '../RewardAlertsButton';

describe('RewardAlertsButton', () => {
  afterEach(() => { cleanup(); enable.mockReset(); });

  it('keeps reward status available from every page and asks permission only on click', async () => {
    render(<MemoryRouter><RewardAlertsButton stakeAddress="stake_test1abc" /></MemoryRouter>);
    expect(screen.getByRole('button', { name: '2 reward token types ready' })).toBeInTheDocument();
    expect(enable).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '2 reward token types ready' }));
    expect(await screen.findByText('2 token types ready to claim')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review rewards' })).toHaveAttribute('href', '/claim');
    fireEvent.click(screen.getByRole('button', { name: 'Enable browser alerts' }));
    expect(enable).toHaveBeenCalledTimes(1);
  });
});
