import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconExternalLink } from '@tabler/icons-react';
import { useClaimStore } from '@/store/claim-state';
import { useWalletDeposit } from '@/features/claim/hooks/useWalletDeposit';
import { useClaimStatus } from '@/features/deposit/hooks/useClaimStatus';
import { Card } from '@/components/common/Card';
import { ClaimProgress, type ClaimProgressStage } from '@/features/claim/components/ClaimProgress';
import { QRCode } from '@/components/common/QRCode';
import { CopyButton } from '@/components/common/CopyButton';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { GradientButton } from '@/components/common/GradientButton';
import { truncateHash, formatAda } from '@/utils/format';

export default function DepositPage() {
  const navigate = useNavigate();
  const request = useClaimStore((s) => s.request);
  const stakeAddress = request?.stakeAddress ?? null;
  const reset = useClaimStore((s) => s.reset);
  const queryClient = useQueryClient();

  const setDepositTransaction = useClaimStore((s) => s.setDepositTransaction);
  const txHash = request?.depositTransaction?.status === 'submitted' ? request.depositTransaction.txHash : null;
  const isSending = request?.depositTransaction?.status === 'signing';
  const [sendError, setSendError] = useState<string | null>(null);

  const { sendDeposit, canSend } = useWalletDeposit();
  const { status, error: statusError, refetch: refetchStatus, txExplorerUrl } = useClaimStatus({
    request_id: request?.requestId ?? null,
    staking_address: stakeAddress,
  });

  useEffect(() => {
    if (!request) void navigate('/claim', { replace: true });
  }, [request, navigate]);

  useEffect(() => {
    if (status?.kind !== 'success' || !stakeAddress) return;
    void queryClient.invalidateQueries({ queryKey: ['rewards', stakeAddress] });
    void queryClient.invalidateQueries({ queryKey: ['delivered-rewards', stakeAddress] });
    void queryClient.invalidateQueries({ queryKey: ['history', stakeAddress] });
    void queryClient.invalidateQueries({ queryKey: ['personal-analytics', stakeAddress] });
  }, [status?.kind, stakeAddress, queryClient]);

  if (!request) return null;
  const { requestId, deposit, overheadFee, withdrawalAddress } = request;
  const totalDue = deposit + overheadFee;

  const handleSend = async () => {
    if (useClaimStore.getState().request?.depositTransaction || status?.kind === 'processing' || status?.kind === 'success' || status?.kind === 'failure') return;
    setSendError(null);
    setDepositTransaction(request, { status: 'signing' });
    try {
      const hash = await sendDeposit({ toAddress: withdrawalAddress, lovelace: totalDue });
      setDepositTransaction(request, { status: 'submitted', txHash: hash });
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Wallet rejected or failed to broadcast.');
      setDepositTransaction(request, undefined);
    }
  };

  const handleCancel = () => {
    if (isSending) return;
    reset();
    void navigate('/claim');
  };

  const isTerminal = status?.kind === 'success' || status?.kind === 'failure';
  const hasSubmitted = !!txHash || status?.kind === 'processing' || status?.kind === 'success';
  const progressStage: ClaimProgressStage | null = statusError || status?.kind === 'failure'
    ? null
    : status?.kind === 'success' ? 'complete'
    : status?.kind === 'processing' ? 'delivery'
    : txHash ? 'confirmation'
    : isSending ? 'signing'
    : null;
  const depositForm = (
    <Card as="section" className="overflow-hidden">
      <div className="flex flex-col items-center gap-5 p-6">
        <QRCode value={withdrawalAddress} amountLovelace={totalDue} size={184} />

        <div className="w-full space-y-3">
          <div>
            <p className="label-eyebrow">Amount due</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-text-primary">
              {formatAda(totalDue)} ADA
            </p>
            <dl className="mt-2 space-y-1 text-xs text-text-muted">
              <div className="flex justify-between gap-3"><dt>Reward deposit</dt><dd>{formatAda(deposit)} ADA</dd></div>
              {overheadFee > 0 && <div className="flex justify-between gap-3"><dt>Processing fee</dt><dd>{formatAda(overheadFee)} ADA</dd></div>}
            </dl>
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
            disabled={!canSend || isSending || isTerminal || hasSubmitted}
          >
            {isSending ? 'Signing...' : isTerminal ? 'Claim closed' : hasSubmitted ? 'Deposit submitted' : 'Send from wallet'}
          </GradientButton>
          <GradientButton variant="secondary" onClick={handleCancel} disabled={isSending}>
            {hasSubmitted || isTerminal ? 'Back to claim' : 'Cancel'}
          </GradientButton>
        </div>
        {sendError && (
          <div className="mt-3">
            <FeedbackBanner tone="error" title="Deposit not sent" message={sendError} />
          </div>
        )}
        {!canSend && !hasSubmitted && !isTerminal && (
          <p className="mt-3 text-xs text-text-muted">
            Connect your wallet here, or send the deposit manually from another wallet — either
            way the status below updates once the deposit is detected.
          </p>
        )}
      </div>
    </Card>
  );

  return (
    <main className="mx-auto max-w-xl space-y-6" aria-labelledby="deposit-title">
      <GradientButton variant="ghost" size="sm" className="-ml-3.5" onClick={handleCancel} disabled={isSending}>
        <IconArrowLeft size={14} stroke={1.6} aria-hidden />
        Back to claim
      </GradientButton>

      <header>
        <h1 id="deposit-title" className="text-2xl font-semibold text-text-primary">{hasSubmitted || isTerminal ? 'Claim status' : 'Send your deposit'}</h1>
        <p className="mt-2 text-sm text-text-muted">
          {hasSubmitted || isTerminal ? 'Track your deposit and reward delivery below.' : <>Send exactly{' '}
          <span className="font-mono text-text-primary">{formatAda(totalDue)} ADA</span> to the
          withdrawal address below. TosiDrop releases your rewards once the deposit is
          detected.</>}
        </p>
      </header>

      {progressStage && <ClaimProgress stage={progressStage} />}

      {hasSubmitted || isTerminal ? (
        <details>
          <summary className="cursor-pointer rounded-lg py-3 text-sm font-medium text-text-secondary focus-visible:outline-2 focus-visible:outline-accent">
            Deposit details
          </summary>
          <div className="mt-2">{depositForm}</div>
        </details>
      ) : depositForm}

      {statusError ? (
        <div className="space-y-3" role="alert">
          <FeedbackBanner tone="error" title="Could not check claim status" message="Your deposit may still be processing. Check again to refresh the latest status." />
          <GradientButton variant="secondary" onClick={() => void refetchStatus()}>Check status again</GradientButton>
        </div>
      ) : (
        <div className="space-y-2">
          {!progressStage && <FeedbackBanner
            tone={status?.kind === 'failure' ? 'error' : 'info'}
            title={status?.kind === 'failure' ? 'Claim failed' : 'Waiting for deposit'}
            message={status?.kind === 'failure'
              ? status.reason || "TosiDrop couldn't complete this claim. Try again or contact support on Discord."
              : 'Send the deposit from any wallet and TosiDrop will release your rewards.'}
          />}
          {!isTerminal && <p className="text-xs text-text-muted">Checking claim status every 15 seconds while this page is open.</p>}
        </div>
      )}

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
    </main>
  );
}
