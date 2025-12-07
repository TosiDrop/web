import { useMemo } from 'react';
import { SectionCard } from '@/components/common/SectionCard';

interface WalletAddressFormProps {
  value: string;
  fallbackAddress?: string;
  onChange: (value: string) => void;
  onSubmit: () => Promise<void> | void;
  isLoading: boolean;
}

const shortenAddress = (address: string): string => {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
};

export const WalletAddressForm = ({
  value,
  fallbackAddress,
  onChange,
  onSubmit,
  isLoading,
}: WalletAddressFormProps) => {
  const canUseFallback = Boolean(fallbackAddress);
  const canSubmit = useMemo(
    () => Boolean(value.trim() || fallbackAddress),
    [value, fallbackAddress]
  );

  return (
    <SectionCard
      title="Wallet address"
      description="Paste any Cardano wallet address or rely on your connected wallet."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await onSubmit();
        }}
      >
        <label className="text-sm font-medium text-gray-200">
          Address
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="addr1..."
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </label>

        <div className="flex flex-col gap-2 text-sm text-gray-300">
          {canUseFallback && (
            <p>
              Connected wallet:{' '}
              <span className="font-mono text-white">
                {shortenAddress(fallbackAddress ?? '')}
              </span>
            </p>
          )}
        </div>

        <div className="text-center">
          <button
            type="submit"
            disabled={!canSubmit || isLoading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            {isLoading ? 'Loading rewards...' : 'Get rewards'}
          </button>
        </div>
      </form>
    </SectionCard>
  );
};

