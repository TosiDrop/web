import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import type { ClaimFlowStep } from '@/types/claim';

interface ClaimStatusProps {
  state: ClaimFlowStep;
  onReset: () => void;
}

export function ClaimStatusDisplay({ state, onReset }: ClaimStatusProps) {
  if (state.step === 'idle') return null;

  if (state.step === 'completed') {
    return (
      <div className="space-y-2">
        <FeedbackBanner
          tone="success"
          title="Claim successful"
          message={`Transaction hash: ${state.txHash}`}
        />
        <button
          onClick={onReset}
          className="text-sm text-gray-400 underline hover:text-white"
        >
          Done
        </button>
      </div>
    );
  }

  if (state.step === 'error') {
    return (
      <FeedbackBanner
        tone="error"
        title="Claim failed"
        message={state.message}
      />
    );
  }

  return null;
}
