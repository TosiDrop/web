import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  IconMapPin,
  IconCoin,
  IconHistory,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useOnboardingStore } from '@/store/onboarding-state';
import { useWalletStore } from '@/store/wallet-state';
import { apiClient } from '@/api/client';

const tourSlides = [
  {
    icon: IconMapPin,
    title: 'Enter your address',
    description: 'Paste your wallet address to see what you can claim.',
    gradient: 'from-brand-cyan/20 to-cyan-500/5',
    iconColor: 'text-brand-cyan',
  },
  {
    icon: IconCoin,
    title: 'Claim your tokens',
    description: 'Pick what you want and send it to your wallet in one step.',
    gradient: 'from-brand-teal/20 to-emerald-500/5',
    iconColor: 'text-brand-teal',
  },
  {
    icon: IconHistory,
    title: 'Track your history',
    description: 'See every claim you have made and what is still coming.',
    gradient: 'from-brand-primary/20 to-purple-500/5',
    iconColor: 'text-brand-primary',
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
      await apiClient.post('/api/user', {
        stakeAddress,
        displayName: profileName.trim() || null,
        bio: profileBio.trim() || null,
        avatarUrl: profileAvatar,
        walletProvider: walletName,
        onboardingCompleted: true,
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
      <button
        onClick={handleBack}
        disabled={saving}
        className="mb-6 flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300 disabled:opacity-50"
      >
        <IconArrowLeft size={14} />
        Back
      </button>

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
              className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${slide.gradient} ring-1 ring-white/5`}
            >
              <slide.icon size={28} className={slide.iconColor} stroke={1.5} />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">{slide.title}</h3>
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide dots */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {tourSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setDirection(i > slideIndex ? 1 : -1);
              setSlideIndex(i);
            }}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === slideIndex ? 'w-6 bg-brand-cyan' : 'w-1.5 bg-slate-600 hover:bg-slate-500'
            }`}
          />
        ))}
      </div>

      {saveError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-status-error/30 bg-status-error/10 px-3 py-2.5">
          <IconAlertCircle size={16} className="mt-0.5 shrink-0 text-status-error" />
          <p className="text-xs text-status-error">{saveError}</p>
        </div>
      )}

      {/* Actions */}
      <button
        onClick={handleNext}
        disabled={saving}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-teal px-6 py-3.5 text-sm font-semibold text-surface-base shadow-lg shadow-brand-cyan/20 transition-all hover:shadow-xl hover:shadow-brand-cyan/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 disabled:opacity-60"
      >
        {saving ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-surface-base" />
            Saving...
          </>
        ) : saveError && isLast ? (
          <>
            <IconArrowRight size={16} />
            Retry
          </>
        ) : isLast ? (
          <>
            <IconCheck size={16} />
            Start using Tosi
          </>
        ) : (
          <>
            Next
            <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      {!isLast && !saving && (
        <button
          onClick={handleFinish}
          className="mt-3 text-xs text-slate-500 transition hover:text-slate-300"
        >
          Skip tour
        </button>
      )}
    </div>
  );
}
