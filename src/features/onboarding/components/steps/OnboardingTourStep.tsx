import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  IconMapPin,
  IconCoin,
  IconHistory,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
} from '@tabler/icons-react';
import { useWallet } from '@meshsdk/react';
import { useOnboardingStore } from '@/store/onboarding-state';
import { useWalletStore } from '@/store/wallet-state';
import { apiClient } from '@/api/client';
import { signProfileUpdate } from '@/features/profile/utils/signProfileUpdate';
import { cn } from '@/lib/utils';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { GradientButton } from '@/components/common/GradientButton';
import { StepHeading } from './StepHeading';

const tourSlides = [
  {
    icon: IconMapPin,
    title: 'Enter your address',
    description: 'Paste your wallet address to see what you can claim.',
    tile: 'bg-accent/10 text-accent',
  },
  {
    icon: IconCoin,
    title: 'Claim your tokens',
    description: 'Pick what you want and send it to your wallet in one step.',
    tile: 'bg-cream/[0.08] text-cream',
  },
  {
    icon: IconHistory,
    title: 'Track your history',
    description: 'See every claim you have made and what is still coming.',
    tile: 'bg-accent/10 text-accent-light',
  },
] as const;

export function OnboardingTourStep() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const {
    profileName,
    profileBio,
    profileAvatar,
    saveError,
    setSaveError,
    closeModal,
  } = useOnboardingStore();
  const { stakeAddress, walletName } = useWalletStore();
  const { wallet, connected: walletConnected } = useWallet();

  const slide = tourSlides[slideIndex];
  const isLast = slideIndex === tourSlides.length - 1;

  async function handleFinish() {
    if (!stakeAddress) {
      closeModal();
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      if (!walletConnected || !wallet) {
        throw new Error('Wallet disconnected — reconnect and try again');
      }
      const auth = await signProfileUpdate(wallet, stakeAddress);
      await apiClient.post('/api/user', {
        stakeAddress,
        displayName: profileName.trim() || null,
        bio: profileBio.trim() || null,
        avatarUrl: profileAvatar,
        walletProvider: walletName,
        onboardingCompleted: true,
        ...auth,
      });
      closeModal();
    } catch (err) {
      console.error('Failed to save user profile:', err);
      setSaveError(
        err instanceof Error ? err.message : 'Could not save your profile. Try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (isLast) {
      handleFinish();
    } else {
      setDirection(1);
      setSlideIndex((i) => i + 1);
    }
  }

  function handleBack() {
    if (slideIndex === 0) {
      useOnboardingStore.getState().setStep('profile-setup');
    } else {
      setDirection(-1);
      setSlideIndex((i) => i - 1);
    }
  }

  return (
    <div className="flex flex-col">
      <GradientButton
        variant="ghost"
        size="sm"
        className="mb-6 -ml-3.5 self-start"
        onClick={handleBack}
        disabled={saving}
      >
        <IconArrowLeft size={14} aria-hidden />
        Back
      </GradientButton>

      {/* Animated slide */}
      <div className="relative mb-8 min-h-[180px] overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slideIndex}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col items-center text-center"
          >
            <div
              className={cn(
                'mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle',
                slide.tile,
              )}
              aria-hidden
            >
              <slide.icon size={28} stroke={1.5} />
            </div>
            <StepHeading className="mb-2 text-lg font-semibold text-text-primary">
              {slide.title}
            </StepHeading>
            <p className="max-w-xs text-sm leading-relaxed text-text-muted">{slide.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide dots */}
      <div className="mb-6 flex items-center justify-center">
        {tourSlides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setDirection(i > slideIndex ? 1 : -1);
              setSlideIndex(i);
            }}
            aria-label={`Slide ${i + 1}`}
            aria-current={i === slideIndex ? 'step' : undefined}
            className="flex h-10 min-w-10 items-center justify-center rounded-lg p-2.5"
          >
            <span
              className={cn(
                'block h-1.5 rounded-full transition-all duration-300',
                i === slideIndex ? 'w-6 bg-accent' : 'w-1.5 bg-border-strong',
              )}
            />
          </button>
        ))}
      </div>

      {saveError && (
        <div className="mb-4">
          <FeedbackBanner tone="error" message={saveError} />
        </div>
      )}

      {/* Actions */}
      <GradientButton className="w-full" onClick={handleNext} disabled={saving}>
        {saving ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-accent-contrast" />
            Saving...
          </>
        ) : saveError && isLast ? (
          <>
            <IconArrowRight size={16} aria-hidden />
            Try again
          </>
        ) : isLast ? (
          <>
            <IconCheck size={16} aria-hidden />
            Start using TosiDrop
          </>
        ) : (
          <>
            Next
            <IconArrowRight size={16} aria-hidden />
          </>
        )}
      </GradientButton>

      {!isLast && !saving && (
        <GradientButton variant="ghost" size="sm" className="mt-3 self-center" onClick={handleFinish}>
          Skip tour
        </GradientButton>
      )}
    </div>
  );
}
