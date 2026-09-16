import { useState, useEffect, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/common/Card';
import { GradientButton } from '@/components/common/GradientButton';
import { useWalletStore } from '@/store/wallet-state';
import { adaHandlesFromAssets, isAdaHandle, stakeAddressError } from '@/utils/ada-handle';
import { truncateHash } from '@/utils/format';

interface GlobalClaimCardProps {
  onLookup: (address: string) => void;
  isLoading: boolean;
  activeAddress: string | null;
  displayName?: string | null;
}

export function GlobalClaimCard({ onLookup, isLoading, activeAddress, displayName }: GlobalClaimCardProps) {
  const { connected, stakeAddress, wallet, walletName } = useWalletStore();
  const { data: handles = [] } = useQuery({
    queryKey: ['wallet-handles', stakeAddress],
    queryFn: async () => adaHandlesFromAssets(await wallet!.getAssets()),
    enabled: connected && !!wallet,
    staleTime: 60_000,
  });
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [handlePage, setHandlePage] = useState(0);
  const handlesPerPage = 10;
  const handlePageCount = Math.max(1, Math.ceil(handles.length / handlesPerPage));
  const visibleHandles = handles.slice(handlePage * handlesPerPage, (handlePage + 1) * handlesPerPage);

  useEffect(() => {
    setManualInput(stakeAddress ?? '');
  }, [stakeAddress]);

  useEffect(() => {
    setHandlePage(0);
  }, [stakeAddress, handles.length]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = manualInput.trim();
    if (isAdaHandle(value)) {
      onLookup(value);
      return;
    }
    const address = value.toLowerCase();
    const problem = stakeAddressError(address);
    if (problem) {
      setError(problem);
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
        {handles.length > 0 && (
          <label className="mt-3 block text-xs text-text-muted">
            Choose a handle from this wallet
            <select
              className="mt-1 block w-full rounded-xl border border-border-subtle bg-surface-inset px-3 py-2 text-sm text-text-primary sm:max-w-xs"
              value={isAdaHandle(manualInput) && handles.includes(manualInput) ? manualInput : ''}
              onChange={(event) => {
                setManualInput(event.target.value);
                setError(null);
                onLookup(event.target.value);
              }}
            >
              <option value="">Select a $handle</option>
              {visibleHandles.map((handle) => <option key={handle} value={handle}>{handle}</option>)}
            </select>
            {handlePageCount > 1 && (
              <div className="mt-2 flex items-center justify-between sm:max-w-xs">
                <button
                  type="button"
                  className="text-xs text-accent-light disabled:text-text-muted"
                  disabled={handlePage === 0}
                  onClick={() => setHandlePage((page) => Math.max(0, page - 1))}
                >
                  Previous
                </button>
                <span className="text-[11px] text-text-muted">Page {handlePage + 1} of {handlePageCount}</span>
                <button
                  type="button"
                  className="text-xs text-accent-light disabled:text-text-muted"
                  disabled={handlePage + 1 >= handlePageCount}
                  onClick={() => setHandlePage((page) => Math.min(handlePageCount - 1, page + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </label>
        )}
        {error && (
          <p id="address-error" role="alert" className="mt-2 text-md text-status-error-light">
            {error}
          </p>
        )}
      </form>

      {connected && stakeAddress && (
        <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-text-secondary">{displayName ?? walletName ?? 'Connected wallet'}</p>
            <p className="font-mono text-[11px] text-text-muted">{truncateHash(stakeAddress, 10, 6)}</p>
          </div>
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
