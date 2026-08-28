import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWalletStore } from '@/store/wallet-state';

const submitMock = vi.fn();
const navigateMock = vi.fn();
vi.mock('@meshsdk/react', () => ({
  useAssets: () => [{ unit: 'pol6d544f5349', policyId: 'pol', assetName: '6d544f5349', fingerprint: '', quantity: '5' }],
  useWallet: () => ({ connected: true, wallet: {}, disconnect: vi.fn() }),
}));
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}));
vi.mock('@/features/projects/api/projects.queries', () => ({
  useTokenMap: () => ({ data: { 'pol.6d544f5349': { ticker: 'TOSI' } } }),
}));
vi.mock('@/features/projects/hooks/useProjectSubmit', () => ({
  useProjectSubmit: () => ({ submit: submitMock, isPending: false }),
}));

import OnboardingPage from '../OnboardingPage';

const STAKE = 'stake1' + 'u'.repeat(40);
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

describe('OnboardingPage', () => {
  afterEach(cleanup);
  beforeEach(() => {
    submitMock.mockReset();
    navigateMock.mockReset();
    useWalletStore.setState({ connected: true, stakeAddress: STAKE, walletName: 'Eternl' });
  });

  it('walks connect → details → token → distribution → review and submits', async () => {
    submitMock.mockResolvedValue({ id: 'new' });
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);

    expect(screen.getByText(/Connected as/)).toBeInTheDocument();
    next();

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: ' Tosi ' } });
    next();

    fireEvent.click(screen.getByRole('button', { name: /TOSI/ }));
    next();

    fireEvent.change(screen.getByLabelText('Tokens per epoch'), { target: { value: '10' } });
    next();

    expect(screen.getByText('10 TOSI / epoch · any pool')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Sign & submit/ }));
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/projects'));
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Tosi', tokenId: 'pol.6d544f5349' }),
    );
  });

  it('blocks progress until a wallet is connected', () => {
    useWalletStore.setState({ connected: false, stakeAddress: null });
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});
