import { IconWallet } from '@tabler/icons-react';
import { GradientButton } from '@/components/common/GradientButton';
import { useOnboardingStore } from '@/store/onboarding-state';
import { useWalletStore } from '@/store/wallet-state';

export function ConnectWallet() {
  const connected = useWalletStore((s) => s.connected);
  const disconnect = useWalletStore((s) => s.disconnect);
  const openModal = useOnboardingStore((s) => s.openModal);

  if (connected) {
    return (
      <GradientButton variant="danger" size="sm" onClick={disconnect} aria-label="Disconnect wallet">
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
