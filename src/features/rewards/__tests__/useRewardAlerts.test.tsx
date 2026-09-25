import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClaimableToken } from '@/shared/rewards';

let rewards: ClaimableToken[] | undefined;
const toastInfo = vi.fn();
const browserNotice = vi.fn().mockResolvedValue(undefined);
vi.mock('../api/rewards.queries', () => ({ useRewards: () => ({ data: rewards, isLoading: false, error: null }) }));
vi.mock('@/store/toast-state', () => ({ toast: { info: (...args: unknown[]) => toastInfo(...args) } }));
vi.mock('../utils/browserRewardNotification', () => ({ showRewardBrowserNotification: (...args: unknown[]) => browserNotice(...args) }));

import { useRewardAlerts } from '../hooks/useRewardAlerts';

function reward(assetId: string, amount: number): ClaimableToken {
  return { assetId, amount, ticker: assetId, logo: '', decimals: 0, premium: false, native: false };
}

describe('useRewardAlerts', () => {
  beforeEach(() => {
    localStorage.clear();
    rewards = undefined;
    toastInfo.mockReset();
    browserNotice.mockClear();
  });
  afterEach(cleanup);

  it('shows current rewards and alerts only when that wallet gains rewards', () => {
    const { result, rerender } = renderHook(({ stake }) => useRewardAlerts(stake), {
      initialProps: { stake: 'stake_test1a' as string | null },
    });
    rewards = [reward('a', 1)];
    rerender({ stake: 'stake_test1a' });
    expect(result.current.count).toBe(1);
    expect(toastInfo).not.toHaveBeenCalled();

    rewards = [reward('a', 1), reward('b', 2)];
    rerender({ stake: 'stake_test1a' });
    expect(toastInfo).toHaveBeenCalledTimes(1);
    expect(toastInfo).toHaveBeenCalledWith('1 new reward token ready to claim', 'Rewards ready');

    rerender({ stake: 'stake_test1a' });
    expect(toastInfo).toHaveBeenCalledTimes(1);

    rerender({ stake: 'stake_test1b' });
    expect(toastInfo).toHaveBeenCalledTimes(1);
  });

  it('requests browser permission only from the explicit enable action', async () => {
    const notification = { permission: 'default', requestPermission: vi.fn() };
    notification.requestPermission.mockImplementation(async () => {
      notification.permission = 'granted';
      return 'granted';
    });
    vi.stubGlobal('Notification', notification);
    rewards = [reward('a', 1)];
    const { result } = renderHook(() => useRewardAlerts('stake_test1a'));
    expect(notification.requestPermission).not.toHaveBeenCalled();

    await act(async () => { await result.current.enableBrowserAlerts(); });
    expect(notification.requestPermission).toHaveBeenCalledTimes(1);
    expect(result.current.browserEnabled).toBe(true);
    vi.unstubAllGlobals();
  });

  it('reports a browser permission failure without enabling alerts', async () => {
    const requestPermission = vi.fn().mockRejectedValue(new Error('blocked'));
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    const { result } = renderHook(() => useRewardAlerts('stake_test1a'));

    await act(async () => { await result.current.enableBrowserAlerts(); });
    expect(result.current.browserEnabled).toBe(false);
    expect(result.current.browserError).toMatch(/browser settings/i);
    vi.unstubAllGlobals();
  });

  it('sends a browser alert for newly available rewards when the tab is hidden', async () => {
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn() });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    rewards = [reward('a', 1)];
    const { result, rerender } = renderHook(() => useRewardAlerts('stake_test1a'));
    await act(async () => { await result.current.enableBrowserAlerts(); });

    rewards = [reward('a', 1), reward('b', 2)];
    rerender();
    expect(browserNotice).toHaveBeenCalledWith('1 new reward token ready to claim');
    expect(toastInfo).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('still alerts in the open tab when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    rewards = [reward('a', 1)];
    const { rerender } = renderHook(() => useRewardAlerts('stake_test1a'));
    rewards = [reward('a', 1), reward('b', 2)];
    rerender();
    expect(toastInfo).toHaveBeenCalledWith('1 new reward token ready to claim', 'Rewards ready');
    vi.restoreAllMocks();
  });
});
