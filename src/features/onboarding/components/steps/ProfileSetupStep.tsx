import { useState, useRef } from 'react';
import { IconCamera, IconArrowRight, IconArrowLeft } from '@tabler/icons-react';
import { useOnboardingStore } from '@/store/onboarding-state';

export function ProfileSetupStep() {
  const {
    profileName,
    profileBio,
    profileAvatar,
    setProfileName,
    setProfileBio,
    setProfileAvatar,
    setStep,
  } = useOnboardingStore();

  const [avatarPreview, setAvatarPreview] = useState<string | null>(profileAvatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setProfileAvatar(result);
    };
    reader.readAsDataURL(file);
  }

  function handleContinue() {
    setStep('onboarding-tour');
  }

  function handleSkip() {
    setStep('onboarding-tour');
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setStep('select-wallet')}
        className="mb-6 flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
      >
        <IconArrowLeft size={14} />
        Back
      </button>

      <h2 className="mb-1 text-xl font-semibold text-white">
        Set up your profile
      </h2>
      <p className="mb-6 text-sm text-slate-400">
        Add a name and picture so others can recognize you.
      </p>

      {/* Avatar */}
      <div className="mb-6 flex justify-center">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border-default bg-surface-inset transition hover:border-brand-cyan/40"
        >
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <IconCamera
              size={24}
              className="text-slate-500 transition group-hover:text-brand-cyan"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
            <IconCamera size={20} className="text-white" />
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>

      {/* Name field */}
      <div className="mb-4">
        <label htmlFor="onboard-name" className="mb-1.5 block text-xs font-medium text-slate-400">
          Display name *
        </label>
        <input
          id="onboard-name"
          type="text"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          placeholder="How should we call you?"
          className="w-full rounded-xl border border-border-subtle bg-surface-inset px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-cyan/40 focus:outline-none focus:ring-1 focus:ring-brand-cyan/20"
          autoFocus
        />
      </div>

      {/* Bio field */}
      <div className="mb-6">
        <label htmlFor="onboard-bio" className="mb-1.5 block text-xs font-medium text-slate-400">
          Bio <span className="text-slate-600">(optional)</span>
        </label>
        <textarea
          id="onboard-bio"
          value={profileBio}
          onChange={(e) => setProfileBio(e.target.value)}
          placeholder="A short intro about yourself..."
          rows={3}
          className="w-full resize-none rounded-xl border border-border-subtle bg-surface-inset px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-cyan/40 focus:outline-none focus:ring-1 focus:ring-brand-cyan/20"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleContinue}
          disabled={!profileName.trim()}
          className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-teal px-6 py-3 text-sm font-semibold text-surface-base transition-all hover:shadow-lg hover:shadow-brand-cyan/20 disabled:opacity-40 disabled:hover:shadow-none"
        >
          Continue
          <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
        <button
          onClick={handleSkip}
          className="rounded-xl px-4 py-3 text-sm text-slate-500 transition hover:text-slate-300"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
