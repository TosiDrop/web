import type { ClaimFlowStep } from '@/types/claim';

interface ClaimButtonProps {
  state: ClaimFlowStep;
  onClaim: () => void;
  disabled?: boolean;
}

const STEP_LABELS: Record<ClaimFlowStep['step'], string> = {
  idle: 'Claim All Rewards',
  creating: 'Preparing claim...',
  awaiting_deposit: 'Deposit required',
  signing: 'Sign in wallet...',
  polling: 'Processing...',
  success: 'Claimed',
  error: 'Retry Claim',
};

const WORKING_STEPS = new Set<ClaimFlowStep['step']>(['creating', 'signing', 'polling']);

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

export function ClaimButton({ state, onClaim, disabled }: ClaimButtonProps) {
  const isWorking = WORKING_STEPS.has(state.step);
  const isAwaitingDeposit = state.step === 'awaiting_deposit';

  return (
    <button
      onClick={onClaim}
      disabled={disabled || isWorking || isAwaitingDeposit}
      className="inline-flex items-center gap-2 rounded-xl bg-brand-cyan px-8 py-3 text-base font-semibold text-surface-base shadow-lg shadow-brand-cyan/25 transition hover:bg-cyan-300 hover:shadow-brand-cyan/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
    >
      {isWorking && <Spinner />}
      {STEP_LABELS[state.step]}
    </button>
  );
}
