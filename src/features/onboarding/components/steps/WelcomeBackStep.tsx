import { useEffect } from 'react';
import { IconCircleCheckFilled } from '@tabler/icons-react';
import { useOnboardingStore } from '@/store/onboarding-state';
import { StepHeading } from './StepHeading';

/**
 * Brief confirmation screen for returning users. Auto-closes after a short
 * beat so the modal doesn't feel like it vanished. This prevents the
 * "three screens then suddenly blank" effect the reviewer flagged.
 */
export function WelcomeBackStep() {
  const { returningUserName, closeModal } = useOnboardingStore();

  useEffect(() => {
    const id = setTimeout(closeModal, 1400);
    return () => clearTimeout(id);
  }, [closeModal]);

  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-status-success/10 ring-1 ring-status-success/30"
        aria-hidden
      >
        <IconCircleCheckFilled size={36} className="text-status-success" />
      </div>

      <StepHeading className="mb-2 text-2xl font-semibold text-text-primary">
        Welcome back{returningUserName ? `, ${returningUserName}` : ''}
      </StepHeading>
      <p className="text-sm text-text-muted">You're all set.</p>
    </div>
  );
}
