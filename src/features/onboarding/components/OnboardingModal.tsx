import { Fragment } from 'react';
import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react';
import { AnimatePresence, motion } from 'motion/react';
import { IconX, IconCheck } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
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
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <IconX size={16} stroke={1.6} />
          </button>

          <Stepper />

          <div className="relative min-h-[360px] px-8 pb-8 pt-2">
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

const STAGES = ['Connect', 'Profile', 'Explore'] as const;
const STAGE_OF: Record<string, number> = {
  welcome: 0,
  'select-wallet': 0,
  connecting: 0,
  'profile-setup': 1,
  'onboarding-tour': 2,
};

function Stepper() {
  const { step } = useOnboardingStore();
  if (step === 'welcome-back' || step === 'complete') return null;

  const current = STAGE_OF[step] ?? 0;

  return (
    <div className="flex items-center justify-center px-8 pt-8">
      {STAGES.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold transition',
                  state === 'done' && 'bg-accent text-accent-contrast',
                  state === 'active' && 'bg-accent/15 text-accent-light ring-1 ring-accent/50',
                  state === 'todo' &&
                    'bg-surface-inset text-[#5A6075] ring-1 ring-[rgba(56,78,128,0.4)]',
                )}
              >
                {state === 'done' ? <IconCheck size={15} stroke={3} /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[10.5px] font-medium',
                  state === 'todo' ? 'text-[#5A6075]' : 'text-[#C5C8D2]',
                )}
              >
                {label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className="mx-2.5 mb-5 h-px w-10 flex-shrink-0 rounded-full"
                style={{
                  background: i < current ? '#22D3EE' : 'rgba(56,78,128,0.5)',
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
