import { useState, useRef } from 'react';
import {
  IconCamera,
  IconArrowRight,
  IconArrowLeft,
  IconX,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useOnboardingStore } from '@/store/onboarding-state';

const MAX_NAME = 50;
const MAX_BIO = 280;
const MAX_AVATAR_BYTES = 500_000; // 500KB pre-resize cap
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_TARGET_SIZE = 256; // square crop

async function resizeAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = AVATAR_TARGET_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  // Center-crop to square, then scale to target.
  const min = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - min) / 2;
  const sy = (bitmap.height - min) / 2;
  ctx.drawImage(bitmap, sx, sy, min, min, 0, 0, size, size);
  return canvas.toDataURL('image/webp', 0.82);
}

export function ProfileSetupStep() {
  const {
    profileName,
    profileBio,
    profileAvatar,
    isFirstTime,
    setProfileName,
    setProfileBio,
    setProfileAvatar,
    setStep,
  } = useOnboardingStore();

  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting same file
    if (!file) return;

    setAvatarError(null);

    if (!ALLOWED_MIME.includes(file.type)) {
      setAvatarError('Use JPG, PNG, or WebP.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES * 20) {
      // hard cap before resize; 20x allowance for unresized input
      setAvatarError('Image is too large (max ~10MB).');
      return;
    }

    setUploadingAvatar(true);
    try {
      const dataUrl = await resizeAvatar(file);
      if (dataUrl.length > MAX_AVATAR_BYTES) {
        setAvatarError('Resized image still too large. Try a simpler photo.');
        return;
      }
      setProfileAvatar(dataUrl);
    } catch (err) {
      console.error('Avatar resize failed:', err);
      setAvatarError('Could not process that image.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  function removeAvatar(e: React.MouseEvent) {
    e.stopPropagation();
    setProfileAvatar(null);
    setAvatarError(null);
  }

  function handleContinue() {
    setStep('onboarding-tour');
  }

  const nameTrimmed = profileName.trim();
  const canContinue = nameTrimmed.length > 0 && nameTrimmed.length <= MAX_NAME;

  return (
    <div className="flex flex-col">
      {isFirstTime ? (
        <button
          onClick={() => setStep('select-wallet')}
          className="mb-6 flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
        >
          <IconArrowLeft size={14} />
          Back
        </button>
      ) : (
        <div className="mb-6 h-4" aria-hidden />
      )}

      <h2 className="mb-1 text-xl font-semibold text-white">
        {isFirstTime ? 'Set up your profile' : 'Finish your profile'}
      </h2>
      <p className="mb-6 text-sm text-slate-400">
        Add a name and picture so others can recognize you.
      </p>

      {/* Avatar */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label="Upload profile picture"
            className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border-default bg-surface-inset transition hover:border-brand-cyan/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 disabled:opacity-60"
          >
            {profileAvatar ? (
              <img
                src={profileAvatar}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <IconCamera
                size={24}
                className="text-slate-500 transition group-hover:text-brand-cyan"
              />
            )}
            {profileAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition group-hover:opacity-100">
                <IconCamera size={20} className="text-white" />
              </div>
            )}
          </button>

          {profileAvatar && !uploadingAvatar && (
            <button
              onClick={removeAvatar}
              aria-label="Remove avatar"
              className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border-default bg-surface-overlay text-slate-300 shadow-sm transition hover:bg-status-error hover:text-white"
            >
              <IconX size={12} />
            </button>
          )}

          {uploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-brand-cyan" />
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
        />

        {avatarError ? (
          <div className="flex items-center gap-1.5 text-[11px] text-status-error">
            <IconAlertCircle size={12} />
            {avatarError}
          </div>
        ) : (
          <span className="text-[11px] text-slate-600">JPG, PNG, or WebP · max 10MB</span>
        )}
      </div>

      {/* Name field */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="onboard-name" className="text-xs font-medium text-slate-400">
            Display name *
          </label>
          <span
            className={`text-[10px] tabular-nums ${
              profileName.length > MAX_NAME ? 'text-status-error' : 'text-slate-600'
            }`}
          >
            {profileName.length}/{MAX_NAME}
          </span>
        </div>
        <input
          id="onboard-name"
          type="text"
          value={profileName}
          maxLength={MAX_NAME + 10}
          onChange={(e) => setProfileName(e.target.value)}
          placeholder="How should we call you?"
          className="w-full rounded-xl border border-border-subtle bg-surface-inset px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-cyan/40 focus:outline-none focus:ring-2 focus:ring-brand-cyan/15"
          autoFocus
        />
      </div>

      {/* Bio field */}
      <div className="mb-6">
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="onboard-bio" className="text-xs font-medium text-slate-400">
            Bio <span className="text-slate-600">(optional)</span>
          </label>
          <span
            className={`text-[10px] tabular-nums ${
              profileBio.length > MAX_BIO ? 'text-status-error' : 'text-slate-600'
            }`}
          >
            {profileBio.length}/{MAX_BIO}
          </span>
        </div>
        <textarea
          id="onboard-bio"
          value={profileBio}
          maxLength={MAX_BIO + 20}
          onChange={(e) => setProfileBio(e.target.value)}
          placeholder="A short intro about yourself..."
          rows={3}
          className="w-full resize-none rounded-xl border border-border-subtle bg-surface-inset px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-cyan/40 focus:outline-none focus:ring-2 focus:ring-brand-cyan/15"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-teal px-6 py-3 text-sm font-semibold text-surface-base shadow-lg shadow-brand-cyan/10 transition-all hover:shadow-xl hover:shadow-brand-cyan/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 disabled:opacity-40 disabled:hover:shadow-none"
        >
          Continue
          <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
        <button
          onClick={handleContinue}
          className="rounded-xl px-4 py-3 text-sm text-slate-500 transition hover:text-slate-300"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
