import { useWallet } from '@meshsdk/react';
import { IconWallet } from '@tabler/icons-react';
import { useOnboardingStore } from '@/store/onboarding-state';

export function ConnectWallet() {
  const { disconnect, connected } = useWallet();
  const { openModal } = useOnboardingStore();

  if (connected) {
    return (
      <button
        onClick={disconnect}
        aria-label="Disconnect wallet"
        className="rounded-lg border border-border-subtle bg-surface-raised/60 px-3 py-1.5 text-xs text-slate-400 transition hover:border-rose-500/30 hover:bg-rose-500/[0.06] hover:text-rose-200"
      >
        Disconnect
      </button>
    );
  }

  return (
    <button
      onClick={openModal}
      className="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(180deg,#6F72F5,#5A5DE8)] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_-14px_rgba(99,102,241,0.85)] transition hover:brightness-110"
    >
      <IconWallet size={13} stroke={1.8} />
      Connect wallet
    </button>
  );
}
