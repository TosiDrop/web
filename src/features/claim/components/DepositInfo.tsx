import type { DepositInfo } from '@/types/claim';
import { lovelaceToAda } from '@/utils/format';

interface DepositInfoDisplayProps {
  depositInfo: DepositInfo;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DepositInfoDisplay({ depositInfo, onConfirm, onCancel }: DepositInfoDisplayProps) {
  const depositAda = lovelaceToAda(depositInfo.deposit);
  const feeAda = lovelaceToAda(depositInfo.overheadFee);

  return (
    <div className="rounded-xl border border-brand-cyan/20 bg-surface-raised p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-brand-cyan animate-pulse" />
        <h3 className="text-sm font-semibold text-white">Confirm Deposit</h3>
      </div>

      <p className="text-xs text-slate-400">
        To claim your rewards, send an ADA deposit to the vending machine. Your rewards will be
        sent back to your wallet along with any remaining ADA.
      </p>

      <div className="space-y-2.5 rounded-lg bg-surface-inset p-3">
        <Row label="Deposit Amount" value={`${depositAda} ADA`} highlight />
        {depositInfo.overheadFee > 0 && (
          <Row label="Processing Fee" value={`${feeAda} ADA`} />
        )}
        <Row
          label="Pool Whitelisted"
          value={depositInfo.isWhitelisted ? 'Yes (no extra fee)' : 'No (includes TosiFee)'}
        />
        <div className="border-t border-border-subtle pt-2">
          <p className="text-[10px] text-slate-500 break-all">
            <span className="text-slate-400">Send to: </span>
            {depositInfo.withdrawalAddress}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onConfirm}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-cyan px-6 py-2.5 text-sm font-semibold text-surface-base shadow-lg shadow-brand-cyan/25 transition hover:bg-cyan-300 hover:shadow-brand-cyan/40"
        >
          Send Deposit
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:text-white"
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
