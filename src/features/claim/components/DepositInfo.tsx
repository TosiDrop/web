import { useState } from 'react';
import type { DepositInfo } from '@/types/claim';
import { lovelaceToAda, truncateHash } from '@/utils/format';

interface DepositInfoDisplayProps {
  depositInfo: DepositInfo;
  canSendFromWallet: boolean;
  onSendFromWallet: () => void;
  onMarkDeposited: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function DepositInfoDisplay({
  depositInfo,
  canSendFromWallet,
  onSendFromWallet,
  onMarkDeposited,
  onCancel,
  busy,
}: DepositInfoDisplayProps) {
  const [copied, setCopied] = useState(false);
  const depositAda = lovelaceToAda(depositInfo.deposit);
  const feeAda = lovelaceToAda(depositInfo.overheadFee);
  const totalAda = lovelaceToAda(depositInfo.deposit + depositInfo.overheadFee);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(depositInfo.withdrawalAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard best-effort */
    }
  };

  return (
    <div className="rounded-xl border border-brand-cyan/20 bg-surface-raised p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-brand-cyan animate-pulse" />
        <h3 className="text-sm font-semibold text-white">Confirm Deposit</h3>
      </div>

      <p className="text-xs text-slate-400">
        To claim your rewards, send the deposit below to the vending machine. Rewards and any
        remaining ADA will be returned to your stake address.
      </p>

      <div className="space-y-2.5 rounded-lg bg-surface-inset p-3">
        <Row label="Deposit" value={`${depositAda} ADA`} highlight />
        {depositInfo.overheadFee > 0 && <Row label="Processing Fee" value={`${feeAda} ADA`} />}
        <Row label="Total to Send" value={`${totalAda} ADA`} />
        <Row
          label="Pool Whitelisted"
          value={depositInfo.isWhitelisted ? 'Yes (no TosiFee)' : 'No (includes TosiFee)'}
        />
        <div className="border-t border-border-subtle pt-2 space-y-1.5">
          <p className="text-[10px] text-slate-500">
            <span className="text-slate-400">Request ID: </span>
            {depositInfo.requestId}
          </p>
          <p className="text-[10px] text-slate-500 break-all font-mono">
            <span className="text-slate-400 font-sans">Send to: </span>
            {depositInfo.withdrawalAddress}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[10px] text-brand-cyan underline hover:text-cyan-300"
          >
            {copied ? 'Copied!' : `Copy address (${truncateHash(depositInfo.withdrawalAddress)})`}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canSendFromWallet ? (
          <button
            onClick={onSendFromWallet}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-cyan px-6 py-2.5 text-sm font-semibold text-surface-base shadow-lg shadow-brand-cyan/25 transition hover:bg-cyan-300 hover:shadow-brand-cyan/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send from Connected Wallet
          </button>
        ) : null}
        <button
          onClick={onMarkDeposited}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-brand-cyan/40 px-6 py-2.5 text-sm font-semibold text-brand-cyan transition hover:bg-brand-cyan/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          I've Sent the Deposit
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={highlight ? 'font-semibold text-brand-cyan' : 'text-white'}>{value}</span>
    </div>
  );
}
