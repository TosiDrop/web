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
    <div className="card-premium p-5">
      <label htmlFor="address-input" className="label-eyebrow">
        Stake address or $handle
      </label>
      <div className="mt-2.5 flex gap-2.5">
        <input
          id="address-input"
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
          placeholder="$handle or stake1…"
          className="min-w-0 flex-1 rounded-[11px] border border-border-subtle bg-surface-inset px-3.5 py-2.5 text-sm text-white placeholder:text-[#5A5E6A] focus:border-accent/50 focus:outline-none"
        />
        <GradientButton
          onClick={handleManualLookup}
          disabled={isLoading || !manualInput.trim()}
        >
          {isLoading ? 'Checking…' : 'Check'}
        </GradientButton>
      </div>

      {connected && stakeAddress && (
        <div className="mt-3.5 flex items-center justify-between border-t border-border-subtle pt-3.5">
          <div className="flex items-center gap-2">
            <span className="h-[7px] w-[7px] rounded-full bg-[#4ADE80]" />
            <span className="font-mono text-xs text-[#8A8E9A]">
              {truncateHash(stakeAddress, 10, 6)}
            </span>
          </div>
          <button
            onClick={handleWalletLookup}
            disabled={isLoading}
            className="text-[12.5px] text-accent-light transition hover:brightness-110 disabled:opacity-40"
          >
            Use connected wallet
          </button>
        </div>
      )}

      {activeAddress && !isLoading && (
        <p className="mt-3 text-[11px] text-[#6B6F7B]">
          Showing rewards for{' '}
          <span className="font-mono text-[#8A8E9A]">{truncateHash(activeAddress, 12, 6)}</span>
        </p>
      )}
    </div>
  );
}
