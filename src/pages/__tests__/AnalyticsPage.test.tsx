import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AnalyticsPage from '../AnalyticsPage';

describe('AnalyticsPage', () => {
  it('establishes public analytics separately from wallet-specific history', () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Public analytics' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pool comparison' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Platform statistics' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open personal analytics' }),
    ).toHaveAttribute('href', '/profile?tab=analytics');
  });
});
