import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react';
import { useOnboardingStore } from '@/store/onboarding-state';
import { WelcomeStep } from './steps/WelcomeStep';
import { SelectWalletStep } from './steps/SelectWalletStep';
import { ConnectingStep } from './steps/ConnectingStep';
import { ProfileSetupStep } from './steps/ProfileSetupStep';
import { OnboardingTourStep } from './steps/OnboardingTourStep';

export function OnboardingModal() {
  const { isOpen, step, closeModal } = useOnboardingStore();

  return (
    <Dialog open={isOpen} onClose={closeModal} className="relative z-[100]">
      <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 data-[closed]:opacity-0" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border-default bg-surface-raised shadow-2xl shadow-black/50 transition-all duration-300 data-[closed]:scale-95 data-[closed]:opacity-0">
          {/* Progress indicator */}
          <StepIndicator />

          {/* Step content */}
          <div className="p-8">
            {step === 'welcome' && <WelcomeStep />}
            {step === 'select-wallet' && <SelectWalletStep />}
            {step === 'connecting' && <ConnectingStep />}
            {step === 'profile-setup' && <ProfileSetupStep />}
            {step === 'onboarding-tour' && <OnboardingTourStep />}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function StepIndicator() {
  const { step } = useOnboardingStore();

  const steps = ['welcome', 'select-wallet', 'profile-setup', 'onboarding-tour'] as const;
  const currentIndex = steps.indexOf(step as typeof steps[number]);
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;

  if (step === 'connecting' || step === 'complete') return null;

  return (
    <div className="h-1 w-full bg-surface-inset">
      <div
        className="h-full bg-gradient-to-r from-brand-cyan to-brand-teal transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
