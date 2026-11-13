import { Dialog, DialogPanel, DialogBackdrop, DialogTitle } from '@headlessui/react';
import { AnimatePresence, motion } from 'motion/react';
import { IconX } from '@tabler/icons-react';
import { EASE_OUT } from '@/lib/motion';
import { useOnboardingStore, type OnboardingStep } from '@/store/onboarding-state';
import { SelectWalletStep } from './steps/SelectWalletStep';
import { ConnectingStep } from './steps/ConnectingStep';
import { ProfileSetupStep } from './steps/ProfileSetupStep';

const TITLES: Record<OnboardingStep, string> = {
  'select-wallet': 'Connect a wallet',
  connecting: 'Connecting',
  'profile-setup': 'Set up your profile',
};

export function OnboardingModal() {
  const { isOpen, step, closeModal } = useOnboardingStore();

  return (
    <Dialog open={isOpen} onClose={closeModal} className="relative z-[100]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-scrim backdrop-blur-md transition-opacity duration-[280ms] ease-out data-[leave]:duration-[220ms] data-[closed]:opacity-0"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border-default bg-surface-raised shadow-pop transition duration-[280ms] ease-out data-[leave]:duration-[220ms] data-[closed]:translate-y-4 data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          <DialogTitle className="sr-only">{TITLES[step]}</DialogTitle>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close"
            className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition hover:bg-tint hover:text-text-primary"
          >
            <IconX size={16} stroke={1.6} />
          </button>

          {/* Old and new steps share one grid cell so they crossfade with no blank frame. */}
          <div className="relative grid px-8 pb-8 pt-8">
            <AnimatePresence initial={false}>
              <motion.div
                key={step}
                style={{ gridArea: '1 / 1' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.16, ease: EASE_OUT } }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
              >
                {step === 'select-wallet' && <SelectWalletStep />}
                {step === 'connecting' && <ConnectingStep />}
                {step === 'profile-setup' && <ProfileSetupStep />}
              </motion.div>
            </AnimatePresence>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
