import { useState } from 'react';
import {
  IconMapPin,
  IconCoin,
  IconHistory,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
} from '@tabler/icons-react';
import { useOnboardingStore } from '@/store/onboarding-state';
import { useWalletStore } from '@/store/wallet-state';
import { apiClient } from '@/api/client';

const tourSlides = [
  {
    icon: IconMapPin,
    title: 'Enter your address',
    description:
      'Paste your Cardano wallet or stake address to check available rewards from your staked pools.',
    color: 'from-brand-cyan/20 to-cyan-500/10',
    iconColor: 'text-brand-cyan',
  },
  {
    icon: IconCoin,
    title: 'Claim your tokens',
    description:
      'Review pending rewards and claim them directly to your wallet with a single transaction.',
    color: 'from-brand-teal/20 to-emerald-500/10',
    iconColor: 'text-brand-teal',
  },
  {
    icon: IconHistory,
    title: 'Track history',
    description:
      'View your complete claim history, distribution schedules, and token delivery status.',
    color: 'from-brand-primary/20 to-purple-500/10',
    iconColor: 'text-brand-primary',
  },
];

export function OnboardingTourStep() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const { profileName, profileBio, profileAvatar, closeModal, reset } = useOnboardingStore();
  const { stakeAddress, walletName } = useWalletStore();

  const slide = tourSlides[slideIndex];
  const isLast = slideIndex === tourSlides.length - 1;

  async function handleFinish() {
    if (!stakeAddress) {
      closeModal();
      reset();
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/api/user', {
        stakeAddress,
        displayName: profileName.trim() || null,
        bio: profileBio.trim() || null,
        avatarUrl: profileAvatar,
        walletProvider: walletName,
        onboardingCompleted: true,
      });
    } catch (err) {
      console.error('Failed to save user profile:', err);
    } finally {
      setSaving(false);
      closeModal();
      reset();
    }
  }

  function handleNext() {
    if (isLast) {
      handleFinish();
    } else {
      setSlideIndex((i) => i + 1);
    }
  }

  function handleBack() {
    if (slideIndex === 0) {
      useOnboardingStore.getState().setStep('profile-setup');
    } else {
      setSlideIndex((i) => i - 1);
    }
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={handleBack}
        className="mb-6 flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
      >
        <IconArrowLeft size={14} />
        Back
      </button>

      {/* Tour slide */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div
          className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${slide.color} ring-1 ring-white/5`}
        >
          <slide.icon size={28} className={slide.iconColor} stroke={1.5} />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-white">{slide.title}</h3>
        <p className="text-sm leading-relaxed text-slate-400">{slide.description}</p>
      </div>

      {/* Slide dots */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {tourSlides.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === slideIndex
                ? 'w-6 bg-brand-cyan'
                : 'w-1.5 bg-slate-600'
            }`}
          />
        ))}
      </div>

      {/* Actions */}
      <button
        onClick={handleNext}
        disabled={saving}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-teal px-6 py-3.5 text-sm font-semibold text-surface-base transition-all hover:shadow-lg hover:shadow-brand-cyan/20 disabled:opacity-60"
      >
        {saving ? (
          'Setting up...'
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

      {!isLast && (
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
