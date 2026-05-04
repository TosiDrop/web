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
  degraded?: boolean;
}

/**
 * Waits reactively for the wallet sync to populate `stakeAddress`, then pings
 * D1 to decide whether this is a returning user (skip onboarding) or a first-
 * time user (advance to profile setup).
 */
export function ConnectingStep() {
  const { connected, stakeAddress } = useWalletStore();
  const {
    setStep,
    setProfileName,
    setProfileBio,
    setProfileAvatar,
    setIsFirstTime,
    setReturningUserName,
  } = useOnboardingStore();
  const advancedRef = useRef(false);

  useEffect(() => {
    if (!connected || !stakeAddress || advancedRef.current) return;
    advancedRef.current = true;

    apiClient
      .get<UserResponse>(`/api/user?stakeAddress=${encodeURIComponent(stakeAddress)}`)
      .then((data) => {
        if (data.exists && data.user?.onboardingCompleted) {
          setIsFirstTime(false);
          setReturningUserName(data.user.displayName ?? null);
          setStep('welcome-back');
        } else if (data.exists && data.user) {
          setIsFirstTime(false);
          if (data.user.displayName) setProfileName(data.user.displayName);
          if (data.user.bio) setProfileBio(data.user.bio);
          if (data.user.avatarUrl) setProfileAvatar(data.user.avatarUrl);
          setStep('profile-setup');
        } else {
          setIsFirstTime(true);
          setStep('profile-setup');
        }
      })
      .catch((err) => {
        console.error('First-time check failed:', err);
        setIsFirstTime(true);
        setStep('profile-setup');
      });
  }, [
    connected,
    stakeAddress,
    setStep,
    setProfileName,
    setProfileBio,
    setProfileAvatar,
    setIsFirstTime,
    setReturningUserName,
  ]);

  return (
    <div className="flex flex-col items-center py-12 text-center">
      {/* Premium pulse ring */}
      <div className="relative mb-8 flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand-cyan/20" />
        <div className="absolute inset-2 animate-ping rounded-full bg-brand-cyan/30 [animation-delay:200ms]" />
        <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-brand-cyan to-brand-teal shadow-lg shadow-brand-cyan/40" />
      </div>

      <h2 className="mb-2 text-xl font-semibold text-white">
        {connected ? 'Almost there' : 'Connecting'}
      </h2>
      <p className="max-w-xs text-sm leading-relaxed text-slate-400">
        {connected
          ? 'Getting your profile ready.'
          : 'Approve the connection in your wallet.'}
      </p>
    </div>
  );
}
