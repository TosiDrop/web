import { useState, useEffect } from 'react';
import { GradientButton } from '@/components/common/GradientButton';
import { useWalletStore } from '@/store/wallet-state';
import { truncateHash } from '@/utils/format';

interface GlobalClaimCardProps {
  onLookup: (address: string) => void;
  isLoading: boolean;
  activeAddress: string | null;
}

export function GlobalClaimCard({ onLookup, isLoading, activeAddress }: GlobalClaimCardProps) {
  const { connected, stakeAddress } = useWalletStore();
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    setManualInput(stakeAddress ?? '');
  }, [stakeAddress]);

  const handleManualLookup = () => {
    const trimmed = manualInput.trim();
    if (trimmed) onLookup(trimmed);
  };

  const handleWalletLookup = () => {
    if (stakeAddress) onLookup(stakeAddress);
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-5 space-y-4">
      <div>
        <label htmlFor="address-input" className="text-xs text-slate-400">
          Stake address or $handle
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="address-input"
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
            placeholder="$handle or stake1..."
            className="flex-1 min-w-0 rounded-lg border border-border-subtle bg-surface-inset px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand-cyan/40 focus:outline-none"
          />
          <GradientButton
            onClick={handleManualLookup}
            disabled={isLoading || !manualInput.trim()}
          >
            {isLoading ? 'Checking...' : 'Check'}
          </GradientButton>
        </div>
      </div>

      {connected && stakeAddress && (
        <div className="flex items-center justify-between border-t border-border-subtle pt-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-xs text-slate-400">
              {truncateHash(stakeAddress, 10, 6)}
            </span>
          </div>
          <button
            onClick={handleWalletLookup}
            disabled={isLoading}
            className="text-xs text-brand-cyan hover:text-cyan-300 disabled:opacity-40"
          >
            Use connected wallet
          </button>
        </div>
      )}

      {activeAddress && !isLoading && (
        <p className="text-[11px] text-slate-500">
          Showing rewards for{' '}
          <span className="font-mono text-slate-400">{truncateHash(activeAddress, 12, 6)}</span>
        </p>
      )}
    </div>
  );
}
