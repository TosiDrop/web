import { useEffect, useRef } from 'react';
import { useWalletStore } from '@/store/wallet-state';
import { useOnboardingStore } from '@/store/onboarding-state';
import { apiClient } from '@/api/client';

interface UserResponse {
  exists: boolean;
  user: { onboardingCompleted: boolean } | null;
}

/**
 * Handles the edge case where the wallet auto-reconnects on page load (e.g.
 * the user already has a session from a previous visit) without going through
 * the onboarding modal. If D1 says they haven't finished onboarding, we open
 * the modal and jump them into profile-setup.
 *
 * For users flowing through the modal, ConnectingStep handles the D1 lookup.
 */
export function useFirstTimeCheck() {
  const { connected, stakeAddress } = useWalletStore();
  const { isOpen, openModal, setStep, setIsFirstTime } = useOnboardingStore();
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset guard on disconnect so the next connection re-checks.
    if (!connected || !stakeAddress) {
      checkedRef.current = null;
      return;
    }
    // If the modal is already open, ConnectingStep owns the check.
    if (isOpen) return;
    if (checkedRef.current === stakeAddress) return;

    checkedRef.current = stakeAddress;

    apiClient
      .get<UserResponse>(`/api/user?stakeAddress=${encodeURIComponent(stakeAddress)}`)
      .then((data) => {
        if (!data.exists || !data.user?.onboardingCompleted) {
          setIsFirstTime(!data.exists);
          openModal();
          // Skip the welcome + wallet-select screens since they're already in.
          setStep('profile-setup');
        }
      })
      .catch((err) => {
        console.error('First-time check (auto-reconnect) failed:', err);
      });
  }, [connected, stakeAddress, isOpen, openModal, setStep, setIsFirstTime]);
}
