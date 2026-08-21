import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWalletStore } from '@/store/wallet-state';

const projectsMock = vi.fn();
const submitMock = vi.fn();
vi.mock('../api/projects.queries', () => ({
  useOwnerProjects: (...a: unknown[]) => projectsMock(...a),
  useTokenMap: () => ({ data: { 'pol.6d544f5349': { ticker: 'TOSI' } } }),
}));
vi.mock('../hooks/useProjectSubmit', () => ({
  useProjectSubmit: () => ({ submit: submitMock, isPending: false }),
}));

import { ProjectDashboard } from '../components/ProjectDashboard';

const STAKE = 'stake1' + 'u'.repeat(40);
const PROJECT = {
  id: 'p1', network: 'preview', ownerAddress: STAKE, name: 'Tosi', description: '',
  website: '', logoUrl: '', tokenId: 'pol.6d544f5349', poolId: '',
  distribution: { amountPerEpoch: '10', minStakeAda: '100', expiryEpochs: 2 },
  status: 'pending', createdAt: '', updatedAt: '', approvedAt: null,
};

const renderIt = () => render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);

describe('ProjectDashboard', () => {
  afterEach(cleanup);
  beforeEach(() => {
    submitMock.mockReset();
    projectsMock.mockReturnValue({ data: [PROJECT], isLoading: false, error: null });
    useWalletStore.setState({ connected: true, stakeAddress: STAKE });
  });

  it('asks for a wallet when disconnected', () => {
    useWalletStore.setState({ connected: false, stakeAddress: null });
    renderIt();
    expect(screen.getByText(/Connect a wallet/)).toBeInTheDocument();
  });

  it('links to onboarding when the owner has no projects', () => {
    projectsMock.mockReturnValue({ data: [], isLoading: false, error: null });
    renderIt();
    expect(screen.getByRole('link', { name: /Register a project/ })).toHaveAttribute('href', '/projects/new');
  });

  it('lists projects with status and distribution summary, and saves edits', async () => {
    submitMock.mockResolvedValue({ id: 'p1' });
    renderIt();
    expect(screen.getByText('Tosi')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('10 TOSI / epoch · min 100 ADA · expires after 2 epochs · any pool')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Tosi v2' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign & save/ }));
    await screen.findByRole('button', { name: /Edit/ });
    expect(submitMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tosi v2' }), 'p1');
  });
});
