import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconExternalLink } from '@tabler/icons-react';
import { useClaimStore } from '@/store/claim-state';
import { useWalletStore } from '@/store/wallet-state';
import { useWalletDeposit } from '@/features/claim/hooks/useWalletDeposit';
import {
  useClaimStatus,
  type ClaimStatusKind,
} from '@/features/deposit/hooks/useClaimStatus';
import { Card } from '@/components/common/Card';
import { QRCode } from '@/components/common/QRCode';
import { CopyButton } from '@/components/common/CopyButton';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { GradientButton } from '@/components/common/GradientButton';
import { truncateHash, formatAda } from '@/utils/format';

const STATUS_COPY: Record<
  ClaimStatusKind,
  { title: string; message: string; tone: 'info' | 'success' | 'error' }
> = {
  waiting: {
    title: 'Waiting for deposit',
    message: 'Send the deposit from any wallet and TosiDrop will release your rewards.',
    tone: 'info',
  },
  processing: {
    title: 'Processing claim',
    message: 'Deposit received. TosiDrop is preparing your reward delivery.',
    tone: 'info',
  },
  success: {
    title: 'Rewards delivered',
    message: 'Your rewards are on their way to your wallet.',
    tone: 'success',
  },
  failure: {
    title: 'Claim failed',
    message: "TosiDrop couldn't complete this claim. Try again or contact support on Discord.",
    tone: 'error',
  },
};

export default function DepositPage() {
  const navigate = useNavigate();
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const request = useClaimStore((s) => s.request);
  const reset = useClaimStore((s) => s.reset);

  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { sendDeposit, canSend } = useWalletDeposit();
  const { status, txExplorerUrl } = useClaimStatus({
    request_id: request?.requestId ?? null,
    staking_address: stakeAddress,
  });

  useEffect(() => {
    if (!request) navigate('/', { replace: true });
  }, [request, navigate]);

  if (!request) return null;
  const { requestId, deposit, withdrawalAddress } = request;

  const handleSend = async () => {
    setSendError(null);
    setIsSending(true);
    try {
      const hash = await sendDeposit({ toAddress: withdrawalAddress, lovelace: deposit });
      setTxHash(hash);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Wallet rejected or failed to broadcast.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    reset();
    navigate('/');
  };

  const isTerminal = status?.kind === 'success' || status?.kind === 'failure';
  const statusCopy = STATUS_COPY[status?.kind ?? 'waiting'];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <GradientButton variant="ghost" size="sm" className="-ml-3.5" onClick={handleCancel}>
        <IconArrowLeft size={14} stroke={1.6} aria-hidden />
        Back to claim
      </GradientButton>

      <header>
        <p className="label-eyebrow">Step 2 · Deposit</p>
        <h1 className="mt-2 text-2xl font-semibold text-text-primary">Send your deposit</h1>
        <p className="mt-2 text-sm text-text-muted">
          Send exactly{' '}
          <span className="font-mono text-text-primary">{formatAda(deposit)} ADA</span> to the
          withdrawal address below. TosiDrop releases your rewards once the deposit is
          detected.
        </p>
      </header>

      <Card as="section" className="overflow-hidden">
        <div className="flex flex-col items-center gap-5 p-6">
          <QRCode value={withdrawalAddress} amountLovelace={deposit} size={184} />

          <div className="w-full space-y-3">
            <div>
              <p className="label-eyebrow">Amount</p>
              <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-text-primary">
                {formatAda(deposit)} ADA
              </p>
            </div>

            <div>
              <p className="label-eyebrow">Withdrawal address</p>
              <div className="mt-1 flex items-start gap-2">
                <p className="min-w-0 break-all font-mono text-xs leading-relaxed text-text-secondary">
                  {withdrawalAddress}
                </p>
                <CopyButton value={withdrawalAddress} ariaLabel="Copy withdrawal address" />
              </div>
            </div>

            <div>
              <p className="label-eyebrow">Request ID</p>
              <div className="mt-1 flex items-start gap-2">
                <p className="min-w-0 break-all font-mono text-xs text-text-muted">{requestId}</p>
                <CopyButton value={requestId} ariaLabel="Copy request ID" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border-subtle bg-surface-inset p-5">
          <div className="flex flex-wrap gap-3">
            <GradientButton
              className="flex-1"
              onClick={handleSend}
              disabled={!canSend || isSending || isTerminal}
            >
              {isSending ? 'Signing...' : 'Send from wallet'}
            </GradientButton>
            <GradientButton variant="secondary" onClick={handleCancel}>
              Cancel
            </GradientButton>
          </div>
          {sendError && (
            <div className="mt-3">
              <FeedbackBanner tone="error" title="Deposit not sent" message={sendError} />
            </div>
          )}
          {!canSend && (
            <p className="mt-3 text-xs text-text-muted">
              Connect your wallet here, or send the deposit manually from another wallet — either
              way the status below updates once the deposit is detected.
            </p>
          )}
        </div>
      </Card>

      <FeedbackBanner
        tone={statusCopy.tone}
        title={statusCopy.title}
        message={
          status?.kind === 'failure' && status.reason ? status.reason : statusCopy.message
        }
      />

      {(txHash || txExplorerUrl) && (
        <Card as="section" className="space-y-3 p-5">
          {txHash && (
            <div>
              <p className="label-eyebrow">Your deposit transaction</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-mono text-xs text-text-secondary">
                  {truncateHash(txHash, 12, 8)}
                </p>
                <CopyButton value={txHash} ariaLabel="Copy deposit transaction hash" />
              </div>
            </div>
          )}
          {txExplorerUrl && (
            <a
              href={txExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent transition hover:text-accent-light"
            >
              View delivery transaction
              <IconExternalLink size={14} stroke={1.6} aria-hidden />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          )}
        </Card>
      )}

      {isTerminal && (
        <GradientButton variant="secondary" className="w-full" onClick={handleCancel}>
          Done
        </GradientButton>
      )}
    </div>
  );
}
