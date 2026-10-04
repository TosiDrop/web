import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const poolsMock = vi.fn();
vi.mock('@/features/team/api/team.queries', async () => {
  const actual = await vi.importActual<typeof import('@/features/team/api/team.queries')>('@/features/team/api/team.queries');
  return { ...actual, useParticipatingPools: () => poolsMock() };
});

import TeamPage from '../TeamPage';

describe('TeamPage', () => {
  afterEach(() => {
    cleanup();
    poolsMock.mockReset();
  });

  it('explains partner benefits and links each pool to safe external details', () => {
    poolsMock.mockReturnValue({
      data: [{
        poolId: 'pool1abc/unsafe', ticker: 'TOSI', name: 'Tosi Pool', logo: '', partner: true,
        description: 'A community-operated pool.',
      }],
      isLoading: false,
      error: null,
    });

    render(<TeamPage />);

    expect(screen.getByRole('heading', { name: 'Participating pools' })).toBeInTheDocument();
    expect(screen.getByText(/Partner pools do not pay claim fees/)).toBeInTheDocument();
    expect(screen.getByText(/1 ADA pool fee/)).toBeInTheDocument();
    expect(screen.getByText('A community-operated pool.')).toBeInTheDocument();
    expect(screen.getByText('TosiDrop partner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View pool details/ })).toHaveAttribute(
      'href', 'https://cexplorer.io/pool/pool1abc%2Funsafe',
    );
    expect(screen.queryByRole('button', { name: /delegate/i })).not.toBeInTheDocument();
  });

  it('filters the participating directory without changing the route', () => {
    poolsMock.mockReturnValue({
      data: [
        { poolId: 'pool1abc', ticker: 'TOSI', name: 'Tosi Pool', logo: '', partner: true, description: null },
        { poolId: 'pool1xyz', ticker: 'APEX', name: 'Apex Pool', logo: '', partner: false, description: null },
      ],
      isLoading: false,
      error: null,
    });

    render(<TeamPage />);

    expect(screen.getByLabelText('2 of 2 pools shown')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search participating pools' }), {
      target: { value: 'apex' },
    });
    expect(screen.getByLabelText('1 of 2 pools shown')).toBeInTheDocument();
    expect(screen.getAllByText('APEX')).not.toHaveLength(0);
    expect(screen.queryByText('TOSI')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Partners only' }));
    expect(screen.getByText('No matching pools')).toBeInTheDocument();
  });
});
