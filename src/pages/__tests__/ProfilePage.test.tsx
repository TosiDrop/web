import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const profileMock = vi.fn();

vi.mock('@/features/history/components/HistoryList', () => ({ HistoryList: () => <div>Claim history content</div> }));
vi.mock('@/features/favorites/components/FavoritesTab', () => ({ FavoritesTab: () => <div>Saved assets content</div> }));
vi.mock('@/features/profile/components/RewardBreakdown', () => ({ RewardBreakdown: () => <div>Reward sources content</div> }));
vi.mock('@/features/profile/components/ProfileForm', () => ({ ProfileForm: () => <div>Profile form content</div> }));
vi.mock('@/features/rewards/components/WalletComposition', () => ({ WalletComposition: () => <div>Portfolio chart content</div> }));
vi.mock('@/features/profile/api/profile.queries', () => ({
  useProfile: () => profileMock(),
}));
vi.mock('@/store/wallet-state', () => ({
  useWalletStore: (selector: (state: Record<string, unknown>) => unknown) => {
    return selector({ connected: true, stakeAddress: 'stake_test1example', walletName: 'Test wallet', networkId: 0 });
  },
}));
import ProfilePage from '../ProfilePage';

describe('ProfilePage', () => {
  afterEach(() => {
    cleanup();
    profileMock.mockReset();
  });

  it('renders portfolio, rewards, activity, saved assets, and account as one workspace', async () => {
    profileMock.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch: vi.fn() });
    render(
      <MemoryRouter initialEntries={['/profile?tab=analytics']}>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Everything you own, earned, and saved.' })).toBeInTheDocument();
    expect(screen.getByText('Portfolio chart content')).toBeInTheDocument();
    expect(await screen.findByText('Reward sources content')).toBeInTheDocument();
    expect(await screen.findByText('Claim history content')).toBeInTheDocument();
    expect(await screen.findByText('Saved assets content')).toBeInTheDocument();
    expect(screen.getByText('Your TosiDrop identity')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('keeps profile failures inside the account workspace with a retry action', () => {
    profileMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('profile unavailable'),
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Profile data is unavailable');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
