import { useEffect, useRef, useState } from 'react';
import { useWalletStore } from '@/store/wallet-state';
import { useOnboardingStore } from '@/store/onboarding-state';
import { apiClient } from '@/api/client';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { StepHeading } from './StepHeading';

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

const PROFILE_ERROR_ADVANCE_MS = 2400;

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
  const [profileError, setProfileError] = useState(false);

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
        setProfileError(true);
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

  // Let the error banner be read before continuing as a new user.
  useEffect(() => {
    if (!profileError) return;
    const id = setTimeout(() => setStep('profile-setup'), PROFILE_ERROR_ADVANCE_MS);
    return () => clearTimeout(id);
  }, [profileError, setStep]);

  return (
    <div className="flex flex-col items-center py-12 text-center" role="status" aria-live="polite">
      <div className="relative mb-8 flex h-20 w-20 items-center justify-center" aria-hidden>
        <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
        <div className="absolute inset-2 animate-ping rounded-full bg-accent/30 [animation-delay:200ms]" />
        <div className="relative h-10 w-10 rounded-full bg-accent" />
      </div>

      <StepHeading className="mb-2 text-xl font-semibold text-text-primary">
        {connected ? 'Almost there' : 'Connecting'}
      </StepHeading>
      <p className="max-w-xs text-sm leading-relaxed text-text-muted">
        {connected ? 'Getting your profile ready.' : 'Approve the connection in your wallet.'}
      </p>

      {profileError && (
        <div className="mt-6 w-full text-left">
          <FeedbackBanner
            tone="error"
            message="Couldn't load your profile — continuing as a new user."
          />
        </div>
      )}
    </div>
  );
}
