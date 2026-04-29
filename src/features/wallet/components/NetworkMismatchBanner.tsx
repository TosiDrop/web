import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { useWalletStore } from '@/store/wallet-state';
import { useNetworkStore, networkFromId, networkLabel } from '@/store/network-state';

export function NetworkMismatchBanner() {
  const selectedNetwork = useNetworkStore((s) => s.selectedNetwork);
  const networkId = useWalletStore((s) => s.networkId);
  const walletNetwork = networkFromId(networkId);

  if (!walletNetwork || walletNetwork === selectedNetwork) return null;

  return (
    <div className="mb-4">
      <FeedbackBanner
        tone="error"
        title="Wallet network mismatch"
        message={`The connected wallet is on ${networkLabel(walletNetwork)}, but ${networkLabel(
          selectedNetwork,
        )} is selected. Switch your wallet network or change the selected network in Profile → Preferences.`}
      />
    </div>
  );
}
