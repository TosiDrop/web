import { useEffect } from 'react';
import { MeshProvider } from '@meshsdk/react';
import { useWalletSync } from './hooks/useWalletSync';
import { useWalletStore } from '@/store/wallet-state';
import { OnboardingModal } from '@/features/onboarding/components/OnboardingModal';

function WalletSync() {
  useWalletSync();
  return null;
}

/**
 * Everything that needs the Mesh SDK lives under this tree, and the tree is
 * lazy-loaded on first connect (or on load when a session was persisted), so
 * visitors who only paste an address never download the wallet stack.
 */
export default function WalletRuntime() {
  const wantRuntime = useWalletStore((s) => s.wantRuntime);
  useEffect(() => {
    wantRuntime();
  }, [wantRuntime]);

  return (
    <MeshProvider>
      <WalletSync />
      <OnboardingModal />
    </MeshProvider>
  );
}
