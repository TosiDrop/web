import { useWalletStore } from '@/store/wallet-state';
import { getNetworkLabel } from '@/utils/format';

export function NetworkStatusWidget() {
  const { networkId, connected } = useWalletStore();

  return (
    <div className="card-premium p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[13.5px] font-semibold text-[#C5C8D2]">Network</h3>
        {connected ? (
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-[#C5C8D2]">
            <span className="h-[7px] w-[7px] rounded-full bg-[#4ADE80]" />
            {getNetworkLabel(networkId)}
          </span>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[#6B6F7B]">
            Disconnected
          </span>
        )}
      </div>
      <p className="mt-2.5 text-[12px] leading-relaxed text-[#6B6F7B]">
        Rewards are processed automatically each epoch.
      </p>
    </div>
  );
}
