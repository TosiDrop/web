import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { truncateHash } from '@/utils/format';
import type { ClaimFlowStep } from '@/types/claim';

interface ClaimStatusProps {
  state: ClaimFlowStep;
  networkId: number | null;
  onReset: () => void;
}

const INFO_MESSAGES: Partial<Record<ClaimFlowStep['step'], string>> = {
  creating: 'Creating claim request...',
  signing: 'Waiting for wallet signature...',
  polling: 'Waiting for the vending machine to deliver rewards...',
};

function explorerTxUrl(txHash: string, networkId: number | null): string {
  const host = networkId === 1 ? 'cexplorer.io' : 'preview.cexplorer.io';
  return `https://${host}/tx/${txHash}`;
}

export function ClaimStatusDisplay({ state, networkId, onReset }: ClaimStatusProps) {
  if (state.step === 'idle' || state.step === 'awaiting_deposit') return null;

  if (state.step === 'success') {
    return (
      <div className="space-y-2">
        <FeedbackBanner
          tone="success"
          title="Rewards delivered"
          message={
            state.txHash
              ? `Delivery tx: ${truncateHash(state.txHash)}`
              : 'Your rewards have been delivered to your wallet.'
          }
        />
        {state.txHash && (
          <a
            href={explorerTxUrl(state.txHash, networkId)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-cyan underline hover:text-cyan-300"
          >
            View on cexplorer
          </a>
        )}
        <div>
          <button
            onClick={onReset}
            className="text-sm text-gray-400 underline hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (state.step === 'error') {
    return (
      <div className="space-y-2">
        <FeedbackBanner tone="error" title="Claim failed" message={state.message} />
        <button
          onClick={onReset}
          className="text-sm text-gray-400 underline hover:text-white"
        >
          Dismiss
        </button>
      </div>
    );
  }

  const message = INFO_MESSAGES[state.step];
  if (!message) return null;

  return (
    <div className="space-y-2">
      <FeedbackBanner tone="info" title="Claim in progress" message={message} />
      {state.step === 'polling' && state.txHash && (
        <a
          href={explorerTxUrl(state.txHash, networkId)}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-brand-cyan underline hover:text-cyan-300"
        >
          View deposit on cexplorer ({truncateHash(state.txHash)})
        </a>
      )}
    </div>
  );
}
