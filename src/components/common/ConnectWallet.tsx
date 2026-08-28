import { useWallet } from '@meshsdk/react';
import { IconWallet } from '@tabler/icons-react';
import { GradientButton } from '@/components/common/GradientButton';
import { useOnboardingStore } from '@/store/onboarding-state';

export function ConnectWallet() {
  const { disconnect, connected } = useWallet();
  const { openModal } = useOnboardingStore();

  if (connected) {
    return (
      <GradientButton
        variant="secondary"
        size="sm"
        onClick={disconnect}
        aria-label="Disconnect wallet"
        className="text-slate-400 hover:border-rose-500/30 hover:bg-rose-500/[0.06] hover:text-rose-200"
      >
        Disconnect
      </GradientButton>
    );
  }

  return (
    <GradientButton size="sm" onClick={openModal}>
      <IconWallet size={14} stroke={1.8} />
      Connect wallet
    </GradientButton>
  );
}
