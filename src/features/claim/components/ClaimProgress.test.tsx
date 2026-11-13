import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ClaimProgress } from './ClaimProgress';

const scene = vi.hoisted(() => ({ setState: vi.fn(), dispose: vi.fn() }));
const createScene = vi.hoisted(() => vi.fn());
vi.mock('./claimScene', () => ({ createClaimScene: createScene }));
let preference: EventTarget & { matches: boolean };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

beforeEach(() => {
  vi.clearAllMocks();
  preference = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal('matchMedia', () => preference);
  createScene.mockResolvedValue(scene);
});

it('plays without controls and stops the loop as soon as delivery completes', async () => {
  const { rerender, unmount } = render(<ClaimProgress stage="confirmation" />);
  await waitFor(() => expect(scene.setState).toHaveBeenLastCalledWith({ playing: true, stage: 'confirmation' }));
  expect(screen.queryByRole('button')).toBeNull();
  rerender(<ClaimProgress stage="complete" />);
  expect(scene.setState).toHaveBeenLastCalledWith({ playing: false, stage: 'complete' });
  expect(screen.getByRole('status')).toHaveTextContent('Rewards delivered');
  expect(screen.queryByRole('button')).toBeNull();
  unmount();
  expect(scene.dispose).toHaveBeenCalledOnce();
});

it('honors reduced motion without hiding the transaction status', async () => {
  preference.matches = true;
  render(<ClaimProgress stage="signing" />);
  await waitFor(() => expect(scene.setState).toHaveBeenLastCalledWith({ playing: false, stage: 'signing' }));
  expect(screen.getByRole('status')).toHaveTextContent('Confirm in your wallet');
  expect(screen.queryByRole('button')).toBeNull();
});

it('stops immediately when the device switches to reduced motion', async () => {
  render(<ClaimProgress stage="delivery" />);
  await waitFor(() => expect(scene.setState).toHaveBeenLastCalledWith({ playing: true, stage: 'delivery' }));
  act(() => {
    preference.matches = true;
    preference.dispatchEvent(new Event('change'));
  });
  expect(scene.setState).toHaveBeenLastCalledWith({ playing: false, stage: 'delivery' });
  expect(screen.queryByRole('button')).toBeNull();
});

it('disposes a scene that finishes loading after the component unmounts', async () => {
  let resolve!: (value: typeof scene) => void;
  createScene.mockImplementation(() => new Promise((done) => { resolve = done; }));
  const { unmount } = render(<ClaimProgress stage="signing" />);
  await waitFor(() => expect(createScene).toHaveBeenCalledOnce());
  unmount();
  await act(async () => { resolve(scene); });
  expect(scene.dispose).toHaveBeenCalledOnce();
  expect(scene.setState).not.toHaveBeenCalled();
});

it('keeps useful status text when WebGL fails', async () => {
  createScene.mockRejectedValue(new Error('WebGL unavailable'));
  render(<ClaimProgress stage="delivery" />);
  await waitFor(() => expect(screen.getByTestId('claim-artwork')).toHaveAttribute('data-renderer', 'fallback'));
  expect(screen.getByRole('status')).toHaveTextContent('Delivering your rewards');
  expect(screen.getByRole('status')).not.toHaveClass('sr-only');
  expect(screen.queryByRole('button')).toBeNull();
});

it('passes each stage to the scene even when playback stays active', async () => {
  const { rerender } = render(<ClaimProgress stage="signing" />);
  await waitFor(() => expect(scene.setState).toHaveBeenLastCalledWith({ playing: true, stage: 'signing' }));
  for (const stage of ['signing', 'confirmation', 'delivery'] as const) {
    rerender(<ClaimProgress stage={stage} />);
    expect(scene.setState).toHaveBeenLastCalledWith({ playing: true, stage });
    expect(screen.getByRole('status')).toHaveClass('sr-only');
    if (stage === 'signing') expect(screen.getByText('Approve in your wallet')).toBeVisible();
    else expect(screen.queryByText('Approve in your wallet')).toBeNull();
  }
});

it('releases the active scene and falls back when its graphics context is lost', async () => {
  render(<ClaimProgress stage="delivery" />);
  await waitFor(() => expect(scene.setState).toHaveBeenCalled());
  act(() => { createScene.mock.calls[0][2](); });
  expect(scene.dispose).toHaveBeenCalledOnce();
  expect(screen.getByTestId('claim-artwork')).toHaveAttribute('data-renderer', 'fallback');
  expect(screen.getByRole('status')).toHaveTextContent('Delivering your rewards');
});
