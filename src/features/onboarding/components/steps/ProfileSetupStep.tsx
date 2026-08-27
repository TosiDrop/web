import { useState, useRef } from 'react';
import {
  IconCamera,
  IconArrowRight,
  IconArrowLeft,
  IconX,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useOnboardingStore } from '@/store/onboarding-state';
import { GradientButton } from '@/components/common/GradientButton';
import { StepHeading } from './StepHeading';

const MAX_NAME = 50;
const MAX_BIO = 280;
const MAX_AVATAR_BYTES = 500_000; // 500KB pre-resize cap
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_TARGET_SIZE = 256; // square crop

const FIELD_CLASS =
  'w-full rounded-xl border border-border-subtle bg-surface-inset px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';

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
        <GradientButton
          variant="ghost"
          size="sm"
          className="mb-6 -ml-3.5 self-start"
          onClick={() => setStep('select-wallet')}
        >
          <IconArrowLeft size={14} aria-hidden />
          Back
        </GradientButton>
      ) : (
        <div className="mb-6 h-9" aria-hidden />
      )}

      <StepHeading className="mb-6 text-xl font-semibold text-text-primary">
        {isFirstTime ? 'Set up your profile' : 'Finish your profile'}
      </StepHeading>

      {/* Avatar */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label="Upload profile picture"
            className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border-default bg-surface-inset transition hover:border-accent/50 disabled:opacity-60"
          >
            {profileAvatar ? (
              <img src={profileAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <IconCamera
                size={24}
                className="text-text-muted transition group-hover:text-accent"
                aria-hidden
              />
            )}
            {profileAvatar && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
                <IconCamera size={20} className="text-text-primary" aria-hidden />
              </span>
            )}
          </button>

          {profileAvatar && !uploadingAvatar && (
            <button
              type="button"
              onClick={removeAvatar}
              aria-label="Remove avatar"
              className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border-default bg-surface-overlay text-text-secondary transition hover:bg-status-error hover:text-text-primary">
                <IconX size={12} aria-hidden />
              </span>
            </button>
          )}

          {uploadingAvatar && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50"
              role="status"
              aria-label="Processing image"
            >
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-accent" />
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
          <div role="alert" className="flex items-center gap-1.5 text-2xs text-status-error-light">
            <IconAlertCircle size={12} aria-hidden />
            {avatarError}
          </div>
        ) : (
          <span className="text-2xs text-text-muted">JPG, PNG, or WebP · max 10MB</span>
        )}
      </div>

      {/* Name field */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="onboard-name" className="text-xs font-medium text-text-secondary">
            Display name *
          </label>
          <span
            className={`text-2xs tabular-nums ${
              profileName.length > MAX_NAME ? 'text-status-error-light' : 'text-text-muted'
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
          placeholder="Your name"
          className={FIELD_CLASS}
        />
      </div>

      {/* Bio field */}
      <div className="mb-6">
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="onboard-bio" className="text-xs font-medium text-text-secondary">
            Bio <span className="text-text-muted">(optional)</span>
          </label>
          <span
            className={`text-2xs tabular-nums ${
              profileBio.length > MAX_BIO ? 'text-status-error-light' : 'text-text-muted'
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
          placeholder="Tell us a bit about yourself"
          rows={3}
          className={`${FIELD_CLASS} resize-none`}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <GradientButton className="flex-1" onClick={handleContinue} disabled={!canContinue}>
          Continue
          <IconArrowRight size={16} aria-hidden />
        </GradientButton>
        <GradientButton variant="ghost" onClick={handleContinue}>
          Skip
        </GradientButton>
      </div>
    </div>
  );
}
