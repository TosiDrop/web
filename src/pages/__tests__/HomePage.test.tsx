import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/store/wallet-state', () => ({
  useWalletStore: (selector: (state: { connected: boolean }) => unknown) => selector({ connected: true }),
}));

import HomePage from '../HomePage';

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

describe('HomePage', () => {
  it('routes connected users into the single portfolio workspace', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/profile');
  });
});
