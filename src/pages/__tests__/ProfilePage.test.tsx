import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The tabs' panels pull in wallet, query and chart code; the deep link is
// what this test pins, so the panels are stubbed.
vi.mock('@/features/history/components/HistoryList', () => ({ HistoryList: () => null }));
vi.mock('@/features/favorites/components/FavoritesTab', () => ({ FavoritesTab: () => null }));
vi.mock('@/features/profile/components/RewardBreakdown', () => ({ RewardBreakdown: () => null }));
vi.mock('@/features/profile/components/PersonalAnalytics', () => ({ PersonalAnalytics: () => null }));
vi.mock('@/features/profile/components/ProfileForm', () => ({ ProfileForm: () => null }));
vi.mock('@/features/preferences/components/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/features/profile/api/profile.queries', () => ({
  useProfile: () => ({ data: undefined, isLoading: false }),
}));

import ProfilePage from '../ProfilePage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ProfilePage />
    </MemoryRouter>,
  );
}

describe('ProfilePage', () => {
  afterEach(cleanup);

  it('opens the tab named in ?tab=', () => {
    renderAt('/profile?tab=analytics');
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to the first tab for an unknown or missing ?tab=', () => {
    renderAt('/profile?tab=nope');
    expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute('aria-selected', 'true');
  });
});
