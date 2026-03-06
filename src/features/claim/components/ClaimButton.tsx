import type { ClaimFlowStep } from '@/types/claim';

interface ClaimButtonProps {
  state: ClaimFlowStep;
  onClaim: () => void;
  disabled?: boolean;
}

const STEP_LABELS: Record<ClaimFlowStep['step'], string> = {
  idle: 'Claim Rewards',
  validating: 'Validating...',
  signing: 'Sign in wallet...',
  submitting: 'Submitting...',
  polling: 'Processing...',
  completed: 'Claimed!',
  error: 'Retry Claim',
};

export function ClaimButton({ state, onClaim, disabled }: ClaimButtonProps) {
  const isWorking = ['validating', 'signing', 'submitting', 'polling'].includes(state.step);

  return (
    <button
      onClick={onClaim}
      disabled={disabled || isWorking}
      className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
    >
      {STEP_LABELS[state.step]}
    </button>
  );
}
