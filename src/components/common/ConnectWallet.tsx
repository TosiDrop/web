import { useWallet } from '@meshsdk/react';
import { useOnboardingStore } from '@/store/onboarding-state';

export function ConnectWallet() {
  const { disconnect, connected } = useWallet();
  const { openModal } = useOnboardingStore();

  if (connected) {
    return (
      <button
        onClick={disconnect}
        aria-label="Disconnect wallet"
        className="rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-slate-400 transition hover:bg-surface-overlay hover:text-white"
      >
        Disconnect
      </button>
    );
  }

  return (
    <button
      onClick={openModal}
      className="rounded-lg bg-gradient-to-r from-brand-cyan to-brand-teal px-4 py-2 text-xs font-semibold text-surface-base transition-all hover:shadow-lg hover:shadow-brand-cyan/20"
    >
      Connect Wallet
    </button>
  );
}
