import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react';
import { AnimatePresence, motion } from 'motion/react';
import { useOnboardingStore } from '@/store/onboarding-state';
import { WelcomeStep } from './steps/WelcomeStep';
import { SelectWalletStep } from './steps/SelectWalletStep';
import { ConnectingStep } from './steps/ConnectingStep';
import { ProfileSetupStep } from './steps/ProfileSetupStep';
import { OnboardingTourStep } from './steps/OnboardingTourStep';
import { WelcomeBackStep } from './steps/WelcomeBackStep';

export function OnboardingModal() {
  const { isOpen, step, closeModal } = useOnboardingStore();

  return (
    <Dialog open={isOpen} onClose={closeModal} className="relative z-[100]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300 ease-out data-[closed]:opacity-0"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border-default bg-surface-raised shadow-2xl shadow-black/50 transition duration-300 ease-out data-[closed]:translate-y-4 data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          {/* Premium radial glow accent */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-48 w-64 -translate-x-1/2 rounded-full bg-brand-cyan/10 blur-3xl"
          />

          <StepIndicator />

          <div className="relative min-h-[380px] p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {step === 'welcome' && <WelcomeStep />}
                {step === 'select-wallet' && <SelectWalletStep />}
                {step === 'connecting' && <ConnectingStep />}
                {step === 'profile-setup' && <ProfileSetupStep />}
                {step === 'onboarding-tour' && <OnboardingTourStep />}
                {step === 'welcome-back' && <WelcomeBackStep />}
              </motion.div>
            </AnimatePresence>
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

  if (step === 'connecting' || step === 'welcome-back' || step === 'complete') return null;

  return (
    <div className="relative h-1 w-full bg-surface-inset">
      <motion.div
        className="h-full bg-gradient-to-r from-brand-cyan to-brand-teal"
        initial={false}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}
