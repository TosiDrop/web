import { IconAlertTriangle, IconArrowRight } from '@tabler/icons-react';
import { useWalletStore } from '@/store/wallet-state';
import { useNetworkStore, networkFromId, networkLabel } from '@/store/network-state';

export function NetworkMismatchBanner() {
  const selectedNetwork = useNetworkStore((s) => s.selectedNetwork);
  const networkId = useWalletStore((s) => s.networkId);
  const walletNetwork = networkFromId(networkId);

  if (!walletNetwork || walletNetwork === selectedNetwork) return null;

  return (
    <div
      role="alert"
      className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-border-subtle bg-[linear-gradient(180deg,#161B2E,#121726)] px-[18px] py-[15px] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]"
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] bg-[#F5B042]/[0.12]">
        <IconAlertTriangle size={19} stroke={1.8} className="text-[#F0B04B]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-[#EDEEF2]">Wallet network mismatch</p>
        <p className="mt-0.5 text-[12.5px] text-[#8A8E9A]">
          Your wallet is on a different network. Switch the wallet, or change the target in
          Profile → Preferences.
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2.5 font-mono text-[11px]">
        <span className="rounded-lg border border-[#F5B042]/20 bg-[#F5B042]/[0.08] px-2.5 py-1.5 text-[#E7B86E]">
          wallet · {networkLabel(walletNetwork).toLowerCase()}
        </span>
        <IconArrowRight size={14} stroke={1.7} className="text-[#5A5E6A]" />
        <span className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-[#A5F3FC]">
          target · {networkLabel(selectedNetwork).toLowerCase()}
        </span>
      </div>
    </div>
  );
}
