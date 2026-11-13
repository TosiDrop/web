import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/api/client';
import { useWalletStore, type WalletInstance } from '@/store/wallet-state';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import type { Project } from '@/shared/projects';
const catalog = vi.hoisted(() => ({ projects: [] as Project[] }));
vi.mock('@/features/tokens/api/tokens.queries', () => ({ usePublicTokens: () => ({ data: { scope: 'public', projects: catalog.projects } }) }));
import { PublishAnnouncement } from '../components/PublishAnnouncement';
const OWNER = 'stake_test1owner';
const project: Project = { id: 'p1', network: DEPLOYMENT_NETWORK, ownerAddress: OWNER, name: 'Gallery', description: '', website: '', logoUrl: '', tokenId: 'asset', poolId: '', distribution: { amountPerEpoch: '1', minStakeAda: '', expiryEpochs: 0 }, status: 'approved', createdAt: '', updatedAt: '', approvedAt: null };
let signData = vi.fn();
function connect(address = OWNER) {
  const wallet = { signData } as unknown as WalletInstance;
  useWalletStore.getState().setWalletState({ connected: true, stakeAddress: address, wallet, networkId: DEPLOYMENT_NETWORK === 'mainnet' ? 1 : 0 });
}
function fill(title = 'Rewards open') {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } });
  fireEvent.change(screen.getByLabelText('Start date and time'), { target: { value: '2099-10-30T12:00' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'A dated owner announcement.' } });
}
async function open(onPublished = vi.fn()) {
  render(<PublishAnnouncement onPublished={onPublished} />);
  await userEvent.click(screen.getByText('Publish a date'));
  return onPublished;
}
describe('PublishAnnouncement', () => {
  beforeEach(() => { catalog.projects = [project]; signData = vi.fn().mockResolvedValue({ signature: 'signature', key: 'key' }); connect(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); useWalletStore.getState().resetWallet(); });
  it('appears only for the connected owner of an approved project on this network', () => {
    const { rerender } = render(<PublishAnnouncement onPublished={() => undefined} />);
    expect(screen.getByText('Publish a date')).toBeInTheDocument();
    act(() => useWalletStore.getState().resetWallet());
    expect(screen.queryByText('Publish a date')).not.toBeInTheDocument();
    act(() => connect('stake_test1other'));
    expect(screen.queryByText('Publish a date')).not.toBeInTheDocument();
    act(() => connect());
    catalog.projects = [{ ...project, status: 'pending' }, { ...project, id: 'othernet', network: DEPLOYMENT_NETWORK === 'mainnet' ? 'preview' : 'mainnet' }];
    rerender(<PublishAnnouncement onPublished={() => undefined} />);
    expect(screen.queryByText('Publish a date')).not.toBeInTheDocument();
  });
  it('requires an explicit submit, signs the exact UTF-8 contract and waits for API acknowledgment', async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ id: 'announcement:created' });
    const onPublished = await open();
    expect(signData).not.toHaveBeenCalled();
    fill('Réwards open');
    await user.click(screen.getByRole('button', { name: 'Sign and publish' }));
    await waitFor(() => expect(onPublished).toHaveBeenCalledOnce());
    const [url, body] = post.mock.calls[0] as [string, { ownerAddress: string; projectId: string; eventId: null; announcement: unknown; signature: string; key: string; message: string }];
    expect(url).toBe('/api/rewardCalendar');
    expect(body).toMatchObject({ ownerAddress: OWNER, projectId: 'p1', eventId: null, announcement: { title: 'Réwards open', startsAt: '2099-10-30T12:00:00.000Z', endsAt: null, description: 'A dated owner announcement.' }, signature: 'signature', key: 'key' });
    const decoded = new TextDecoder().decode(Uint8Array.from((signData.mock.calls[0][1] as string).match(/../g)!, (hex) => parseInt(hex, 16)));
    expect(signData.mock.calls[0][0]).toBe(OWNER);
    expect(decoded).toBe(body.message);
    expect(body.message).toMatch(/^TosiDrop calendar announcement v1\n/);
    const payload = JSON.parse(body.message.split('\n')[1]);
    expect(payload).toMatchObject({ network: DEPLOYMENT_NETWORK, origin: window.location.origin, ownerAddress: OWNER, projectId: 'p1', eventId: null });
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(body.announcement)));
    expect(payload.payloadHash).toBe(Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''));
    expect(screen.getByRole('status')).toHaveTextContent('Date published');
  });
  it('rejects end-before-start and past dates before prompting the wallet', async () => {
    await open(); fill();
    fireEvent.change(screen.getByLabelText('End date and time (optional)'), { target: { value: '2099-10-29T12:00' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign and publish' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('End must follow start');
    fireEvent.change(screen.getByLabelText('End date and time (optional)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Start date and time'), { target: { value: '2020-01-01T00:00' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign and publish' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('future');
    expect(signData).not.toHaveBeenCalled();
  });
  it.each([{ title: 'x'.repeat(121), description: 'Valid body' }, { title: 'Valid title', description: 'x'.repeat(1001) }])('validates text limits before signing %j', async ({ title, description }) => {
    await open(); fill(title);
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: description } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign and publish' }).closest('form')!);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(signData).not.toHaveBeenCalled();
  });
  it('requires a valid publication acknowledgement before reporting success', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ unexpected: true });
    const onPublished = await open(); fill();
    await userEvent.click(screen.getByRole('button', { name: 'Sign and publish' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('server did not confirm');
    expect(onPublished).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('shows an API failure and preserves the draft for a retry', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Announcement storage is unavailable')).mockResolvedValueOnce({ id: 'announcement:retry' });
    const onPublished = await open(); fill();
    await user.click(screen.getByRole('button', { name: 'Sign and publish' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Announcement storage is unavailable');
    expect(screen.getByLabelText('Title')).toHaveValue('Rewards open');
    expect(onPublished).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sign and publish' }));
    await waitFor(() => expect(onPublished).toHaveBeenCalledOnce());
  });
  it('discards a stale wallet signature when the account changes while signing', async () => {
    let resolve!: (value: { signature: string; key: string }) => void;
    signData.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const post = vi.spyOn(apiClient, 'post');
    const onPublished = await open(); fill();
    await userEvent.click(screen.getByRole('button', { name: 'Sign and publish' }));
    await waitFor(() => expect(signData).toHaveBeenCalledOnce());
    act(() => useWalletStore.getState().resetWallet());
    await act(async () => resolve({ signature: 'old', key: 'old' }));
    expect(post).not.toHaveBeenCalled();
    expect(onPublished).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('keeps later draft edits when an earlier submitted date is acknowledged', async () => {
    let resolve!: (value: { id: string }) => void;
    vi.spyOn(apiClient, 'post').mockImplementation(() => new Promise((done) => { resolve = done; }));
    const onPublished = await open(); fill();
    await userEvent.click(screen.getByRole('button', { name: 'Sign and publish' }));
    await waitFor(() => expect(resolve).toBeTypeOf('function'));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Next draft' } });
    await act(async () => resolve({ id: 'announcement:first' }));
    expect(screen.getByLabelText('Title')).toHaveValue('Next draft');
    expect(onPublished).toHaveBeenCalledOnce();
  });
});
