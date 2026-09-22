import { cleanup, render, screen } from '@testing-library/react';
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
    expect(screen.getByText(/1 ADA pool fee/)).toBeInTheDocument();
    expect(screen.getByText('A community-operated pool.')).toBeInTheDocument();
    expect(screen.getByText('TosiDrop partner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View pool details/ })).toHaveAttribute(
      'href', 'https://cexplorer.io/pool/pool1abc%2Funsafe',
    );
    expect(screen.queryByRole('button', { name: /delegate/i })).not.toBeInTheDocument();
  });
});
