import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconCopy, IconCheck, IconExternalLink } from '@tabler/icons-react';
import { useClaimStore } from '@/store/claim-state';
import { useWalletStore } from '@/store/wallet-state';
import { useNetworkStore } from '@/store/network-state';
import { useWalletDeposit } from '@/features/claim/hooks/useWalletDeposit';
import { useClaimStatus } from '@/features/deposit/hooks/useClaimStatus';
import { QRCode } from '@/components/common/QRCode';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { truncateHash } from '@/utils/format';

function formatAda(lovelace: number): string {
  return (lovelace / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border-subtle bg-surface-inset/60 p-1.5 transition hover:border-brand-cyan/40 hover:text-brand-cyan"
      aria-label="Copy"
    >
      {copied ? <IconCheck size={12} stroke={2} /> : <IconCopy size={12} stroke={1.6} />}
    </button>
  );
}

const STATUS_COPY: Record<string, { title: string; message: string; tone: 'info' | 'success' | 'error' }> = {
  waiting: {
    title: 'Waiting for deposit',
    message: 'Send the deposit from your wallet (or another wallet) so the vending machine can release your rewards.',
    tone: 'info',
  },
  processing: {
    title: 'Processing claim',
    message: 'Deposit received. The vending machine is preparing the reward delivery transaction.',
    tone: 'info',
  },
  success: {
    title: 'Rewards delivered',
    message: 'The vending machine has sent your rewards.',
    tone: 'success',
  },
  failure: {
    title: 'Claim failed',
    message: 'The vending machine could not complete this claim.',
    tone: 'error',
  },
};

export default function DepositPage() {
  const navigate = useNavigate();
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const network = useNetworkStore((s) => s.selectedNetwork);
  const { requestId, deposit, withdrawalAddress, reset } = useClaimStore();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { sendDeposit, canSend } = useWalletDeposit();
  const { status, txExplorerUrl } = useClaimStatus({
    request_id: requestId,
    staking_address: stakeAddress,
    network,
  });

  useEffect(() => {
    if (!requestId || deposit === null || !withdrawalAddress) {
      navigate('/', { replace: true });
    }
  }, [requestId, deposit, withdrawalAddress, navigate]);

  if (!requestId || deposit === null || !withdrawalAddress) return null;

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
  const statusCopy = status ? STATUS_COPY[status.kind] : STATUS_COPY.waiting;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <button
        type="button"
        onClick={handleCancel}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-slate-200"
      >
        <IconArrowLeft size={14} stroke={1.6} />
        Back to claim
      </button>

      <header>
        <p className="label-eyebrow">Step 2 · Deposit</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Send your deposit</h1>
        <p className="mt-2 text-sm text-slate-400">
          Send exactly{' '}
          <span className="font-mono text-white">{formatAda(deposit)} ADA</span> to the
          withdrawal address below. The vending machine releases your rewards once
          the deposit is detected.
        </p>
      </header>

      {/* QR + address card */}
      <section className="card-premium overflow-hidden">
        <div className="flex flex-col items-center gap-5 p-6">
          <QRCode value={withdrawalAddress} amountLovelace={deposit} size={184} />

          <div className="w-full space-y-3">
            <div>
              <p className="label-eyebrow">Amount</p>
              <p className="mt-1 font-mono text-lg font-semibold text-white">
                {formatAda(deposit)} ADA
              </p>
            </div>

            <div>
              <p className="label-eyebrow">Withdrawal address</p>
              <div className="mt-1 flex items-start gap-2">
                <p className="break-all font-mono text-[12px] leading-relaxed text-slate-300">
                  {withdrawalAddress}
                </p>
                <CopyButton value={withdrawalAddress} />
              </div>
            </div>

            <div>
              <p className="label-eyebrow">Request id</p>
              <p className="mt-1 font-mono text-xs text-slate-400">{requestId}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border-subtle bg-surface-inset/40 p-5">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend || isSending || isTerminal}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-cyan px-6 py-2.5 text-sm font-semibold text-surface-base shadow-lg shadow-brand-cyan/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {isSending ? 'Signing...' : 'Send from wallet'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-surface-overlay hover:text-white"
            >
              Cancel
            </button>
          </div>
          {sendError && (
            <p className="mt-3 text-xs text-rose-300">{sendError}</p>
          )}
          {!canSend && (
            <p className="mt-3 text-xs text-slate-500">
              Connect your wallet here, or send the deposit manually from another wallet — either way the
              status below updates once the deposit is detected.
            </p>
          )}
        </div>
      </section>

      {/* Live status */}
      <FeedbackBanner
        tone={statusCopy.tone}
        title={statusCopy.title}
        message={
          status?.kind === 'failure' && status.reason
            ? status.reason
            : statusCopy.message
        }
      />

      {(txHash || status?.txHash || txExplorerUrl) && (
        <section className="card-premium p-5 space-y-3">
          {txHash && (
            <div>
              <p className="label-eyebrow">Your deposit tx</p>
              <p className="mt-1 font-mono text-xs text-slate-300">
                {truncateHash(txHash, 12, 8)}
              </p>
            </div>
          )}
          {txExplorerUrl && (
            <a
              href={txExplorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-brand-cyan transition hover:text-cyan-300"
            >
              View delivery tx
              <IconExternalLink size={12} stroke={1.6} />
            </a>
          )}
        </section>
      )}

      {isTerminal && (
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex w-full items-center justify-center rounded-xl border border-border-subtle px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-surface-overlay hover:text-white"
        >
          Done
        </button>
      )}
    </div>
  );
}
