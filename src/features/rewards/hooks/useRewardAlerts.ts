import { useEffect, useRef, useState } from 'react';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { toast } from '@/store/toast-state';
import { useRewards } from '../api/rewards.queries';
import { compareRewardSnapshots, rewardSnapshot, rewardSnapshotKey, type RewardAmount } from '../utils/rewardAlerts';
import { showRewardBrowserNotification } from '../utils/browserRewardNotification';

function readSnapshot(key: string): RewardAmount[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((item) =>
      item && typeof item.assetId === 'string' && typeof item.amount === 'number' && Number.isFinite(item.amount)
    )) return null;
    return parsed as RewardAmount[];
  } catch {
    return null;
  }
}

function readBrowserPreference(key: string): boolean {
  try { return localStorage.getItem(`${key}:browser`) === '1'; } catch { return false; }
}

export function useRewardAlerts(stakeAddress: string | null) {
  const { data, isLoading, error } = useRewards(stakeAddress);
  const key = stakeAddress ? rewardSnapshotKey(DEPLOYMENT_NETWORK, stakeAddress) : null;
  const [browserSetting, setBrowserSetting] = useState<{ key: string; enabled: boolean } | null>(null);
  const [browserFailure, setBrowserFailure] = useState<{ key: string; message: string } | null>(null);
  const memorySnapshots = useRef(new Map<string, RewardAmount[]>());
  const browserEnabled = !!key && 'Notification' in window && Notification.permission === 'granted' &&
    (browserSetting?.key === key ? browserSetting.enabled : readBrowserPreference(key));
  const browserError = browserFailure?.key === key ? browserFailure.message : null;
  const count = data ? rewardSnapshot(data).length : null;

  useEffect(() => {
    if (!key || !data) return;
    const current = rewardSnapshot(data);
    const previous = readSnapshot(key) ?? memorySnapshots.current.get(key) ?? null;
    const { newCount } = compareRewardSnapshots(previous, current);
    memorySnapshots.current.set(key, current);
    try { localStorage.setItem(key, JSON.stringify(current)); } catch { /* alerts still work for this render */ }
    if (newCount === 0) return;
    const message = `${newCount} new reward token${newCount === 1 ? '' : 's'} ready to claim`;
    if (document.visibilityState === 'hidden' && browserEnabled) {
      void showRewardBrowserNotification(message);
    } else {
      toast.info(message, 'Rewards ready');
    }
  }, [browserEnabled, data, key]);

  const enableBrowserAlerts = async () => {
    if (!key || !('Notification' in window)) {
      if (key) setBrowserFailure({ key, message: 'Browser alerts are unavailable here. In-app reward alerts remain active.' });
      return;
    }
    let permission: NotificationPermission;
    try {
      permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
    } catch {
      setBrowserFailure({ key, message: 'Allow notifications in your browser settings to receive browser alerts.' });
      return;
    }
    if (permission !== 'granted') {
      setBrowserFailure({ key, message: 'Allow notifications in your browser settings to receive browser alerts.' });
      return;
    }
    try { localStorage.setItem(`${key}:browser`, '1'); } catch { /* current tab still uses the selected setting */ }
    setBrowserSetting({ key, enabled: true });
    setBrowserFailure(null);
  };

  const disableBrowserAlerts = () => {
    if (key) {
      try { localStorage.removeItem(`${key}:browser`); } catch { /* current tab still disables alerts */ }
    }
    if (key) setBrowserSetting({ key, enabled: false });
    setBrowserFailure(null);
  };

  return { count, isLoading, error, browserEnabled, browserError, enableBrowserAlerts, disableBrowserAlerts };
}
