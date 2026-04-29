import { useNetworkStore, networkLabel, type Network } from '@/store/network-state';

const OPTIONS: Network[] = ['mainnet', 'preview'];

export function NetworkSelector() {
  const selectedNetwork = useNetworkStore((s) => s.selectedNetwork);
  const setNetwork = useNetworkStore((s) => s.setNetwork);

  return (
    <div className="space-y-2">
      <label htmlFor="network-select" className="block text-xs text-slate-400">
        Network
      </label>
      <select
        id="network-select"
        value={selectedNetwork}
        onChange={(e) => setNetwork(e.target.value as Network)}
        className="rounded-lg border border-border-subtle bg-surface-inset px-3 py-1.5 text-xs text-white focus:border-brand-cyan/40 focus:outline-none"
      >
        {OPTIONS.map((value) => (
          <option key={value} value={value}>
            {networkLabel(value)}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-slate-500">
        Wallets and API calls must run on the selected network.
      </p>
    </div>
  );
}
