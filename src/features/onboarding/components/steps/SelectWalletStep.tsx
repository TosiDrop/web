import { useWallet, useWalletList } from '@meshsdk/react';
import { IconArrowLeft, IconAlertCircle } from '@tabler/icons-react';
import type { Wallet } from '@meshsdk/common';
import { useOnboardingStore } from '@/store/onboarding-state';

const WALLET_FALLBACK_ICON =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>';

export function SelectWalletStep() {
  const { connect } = useWallet();
  const wallets = useWalletList();
  const { setStep, setConnectError, connectError } = useOnboardingStore();

  function handleSelect(walletName: string) {
    setConnectError(null);
    setStep('connecting');
    connect(walletName).catch((err) => {
      console.error('Wallet connect failed:', err);
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Connection rejected. Try again or pick a different wallet.';
      setConnectError(msg);
      setStep('select-wallet');
    });
    // Advancement to 'profile-setup' happens reactively in ConnectingStep
    // once useWalletSync populates the store.
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setStep('welcome')}
        className="mb-6 flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
      >
        <IconArrowLeft size={14} />
        Back
      </button>

      <h2 className="mb-1 text-xl font-semibold text-white">
        Choose your wallet
      </h2>
      <p className="mb-6 text-sm text-slate-400">
        Select a Cardano wallet provider. Your keys never leave the extension.
      </p>

      {connectError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-status-error/30 bg-status-error/10 px-3 py-2.5">
          <IconAlertCircle size={16} className="mt-0.5 shrink-0 text-status-error" />
          <p className="text-xs text-status-error">{connectError}</p>
        </div>
      )}

      {wallets.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-inset p-6 text-center">
          <p className="text-sm text-slate-400">No Cardano wallets detected.</p>
          <p className="mt-2 text-xs text-slate-500">
            Install a wallet extension like Eternl, Nami, or Flint to continue.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {wallets.map((w: Wallet) => (
            <button
              key={w.name}
              onClick={() => handleSelect(w.name)}
              className="group flex w-full items-center gap-3 rounded-xl border border-border-subtle bg-surface-inset px-4 py-3.5 transition-all hover:border-brand-cyan/40 hover:bg-surface-overlay hover:shadow-lg hover:shadow-brand-cyan/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
            >
              <img
                src={w.icon}
                alt={w.name}
                className="h-8 w-8 rounded-lg"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = WALLET_FALLBACK_ICON;
                }}
              />
              <span className="text-sm font-medium text-slate-200">
                {w.name}
              </span>
              <span className="ml-auto text-xs text-slate-500 transition group-hover:text-brand-cyan">
                Connect →
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-600">
        By connecting, you agree that Tosi can read your stake address.
        We never request signing rights over your assets.
      </p>
    </div>
  );
}
