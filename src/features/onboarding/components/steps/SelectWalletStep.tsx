import { useWallet, useWalletList } from '@meshsdk/react';
import { IconArrowRight } from '@tabler/icons-react';
import type { Wallet } from '@meshsdk/common';
import { useOnboardingStore } from '@/store/onboarding-state';
import { Card } from '@/components/common/Card';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { StepHeading } from './StepHeading';

const WALLET_FALLBACK_ICON =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%238F95A8" stroke-width="1.5"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>';

export function SelectWalletStep() {
  const { connect } = useWallet();
  const wallets = useWalletList();
  const { setStep, setConnectError, connectError } = useOnboardingStore();

  function handleSelect(walletName: string) {
    setConnectError(null);
    setStep('connecting');
    connect(walletName, true).catch((err) => {
      console.error('Wallet connect failed:', err);
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Connection canceled. Try again, or pick a different wallet.';
      setConnectError(msg);
      setStep('select-wallet');
    });
    // Advancement to 'profile-setup' happens reactively in ConnectingStep
    // once useWalletSync populates the store.
  }

  return (
    <div className="flex flex-col">

      <StepHeading className="mb-6 text-xl font-semibold text-text-primary">Connect a wallet</StepHeading>

      {connectError && (
        <div className="mb-4">
          <FeedbackBanner tone="error" message={connectError} />
        </div>
      )}

      {wallets.length === 0 ? (
        <Card variant="inset" className="rounded-xl p-6 text-center">
          <p className="text-sm font-semibold text-text-primary">No wallets found</p>
          <p className="mt-1.5 text-sm text-text-muted">
            Install one like Eternl, Lace, or Yoroi to continue.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {wallets.map((w: Wallet) => (
            <button
              key={w.name}
              type="button"
              onClick={() => handleSelect(w.name)}
              className="group flex w-full items-center gap-3 rounded-xl border border-border-subtle bg-surface-inset px-4 py-3.5 transition hover:border-accent/40 hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <img
                src={w.icon}
                alt=""
                className="h-8 w-8 rounded-md"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = WALLET_FALLBACK_ICON;
                }}
              />
              <span className="text-sm font-medium text-text-primary">{w.name}</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-text-muted transition group-hover:text-accent">
                Connect
                <IconArrowRight size={14} aria-hidden />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
