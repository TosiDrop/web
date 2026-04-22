import { useEffect, useRef } from 'react';
import { useWalletStore } from '@/store/wallet-state';
import { useOnboardingStore } from '@/store/onboarding-state';
import { apiClient } from '@/api/client';

interface UserResponse {
  exists: boolean;
  user: {
    stakeAddress: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    onboardingCompleted: boolean;
  } | null;
}

/**
 * After wallet connects, checks D1 to see if user has completed onboarding.
 * If they haven't (or are new), skips ahead to profile-setup step in the modal.
 * If they have, closes the modal silently.
 */
export function useFirstTimeCheck() {
  const { connected, stakeAddress } = useWalletStore();
  const { isOpen, step, setStep, setIsFirstTime, setProfileName, setProfileBio, closeModal } =
    useOnboardingStore();
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    // Only check when we just connected via the modal and reached profile-setup
    if (!connected || !stakeAddress || !isOpen) return;
    if (step !== 'profile-setup') return;
    if (checkedRef.current === stakeAddress) return;

    checkedRef.current = stakeAddress;

    apiClient
      .get<UserResponse>(`/api/user?stakeAddress=${encodeURIComponent(stakeAddress)}`)
      .then((data) => {
        if (data.exists && data.user?.onboardingCompleted) {
          // Returning user — skip onboarding
          setIsFirstTime(false);
          closeModal();
        } else if (data.exists && data.user) {
          // User exists but hasn't finished onboarding — pre-fill and continue
          setIsFirstTime(false);
          if (data.user.displayName) setProfileName(data.user.displayName);
          if (data.user.bio) setProfileBio(data.user.bio);
        } else {
          // First time user — continue through onboarding
          setIsFirstTime(true);
        }
      })
      .catch((err) => {
        // On error, just let them continue through onboarding
        console.error('First-time check failed:', err);
      });
  }, [connected, stakeAddress, isOpen, step, setStep, setIsFirstTime, setProfileName, setProfileBio, closeModal]);
}
