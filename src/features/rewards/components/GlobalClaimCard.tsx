import { useState, useEffect, type FormEvent } from 'react';
import { Card } from '@/components/common/Card';
import { GradientButton } from '@/components/common/GradientButton';
import { useWalletStore } from '@/store/wallet-state';
import { isAdaHandle, isStakeAddress } from '@/utils/ada-handle';
import { truncateHash } from '@/utils/format';

interface GlobalClaimCardProps {
  onLookup: (address: string) => void;
  isLoading: boolean;
  activeAddress: string | null;
}

export function GlobalClaimCard({ onLookup, isLoading, activeAddress }: GlobalClaimCardProps) {
  const { connected, stakeAddress } = useWalletStore();
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setManualInput(stakeAddress ?? '');
  }, [stakeAddress]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = manualInput.trim();
    if (isAdaHandle(value)) {
      onLookup(value);
      return;
    }
    const address = value.toLowerCase();
    if (!isStakeAddress(address)) {
      setError('Enter a $handle or a valid stake address.');
      return;
    }
    onLookup(address);
  };

  const handleWalletLookup = () => {
    if (!stakeAddress) return;
    setError(null);
    onLookup(stakeAddress);
  };

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="address-input" className="label-eyebrow">
          Stake address or $handle
        </label>
        <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row">
          <input
            id="address-input"
            type="text"
            value={manualInput}
            onChange={(e) => {
              setManualInput(e.target.value);
              setError(null);
            }}
            placeholder="$handle or stake1…"
            aria-invalid={!!error}
            aria-describedby={error ? 'address-error' : undefined}
            className="h-11 min-w-0 rounded-xl sm:flex-1 border border-border-subtle bg-surface-inset px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/50 aria-invalid:border-status-error/60"
          />
          <GradientButton type="submit" disabled={isLoading || !manualInput.trim()}>
            {isLoading ? 'Looking up…' : 'Look up rewards'}
          </GradientButton>
        </div>
        {error && (
          <p id="address-error" role="alert" className="mt-2 text-md text-status-error-light">
            {error}
          </p>
        )}
      </form>

      {connected && stakeAddress && (
        <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
          <span className="font-mono text-xs text-text-muted">
            {truncateHash(stakeAddress, 10, 6)}
          </span>
          <GradientButton variant="ghost" size="sm" onClick={handleWalletLookup} disabled={isLoading}>
            Use connected wallet
          </GradientButton>
        </div>
      )}

      {activeAddress && !isLoading && (
        <p className="mt-3 text-xs text-text-muted">
          Showing rewards for{' '}
          <span className="font-mono text-text-secondary">{truncateHash(activeAddress, 12, 6)}</span>
        </p>
      )}
    </Card>
  );
}
