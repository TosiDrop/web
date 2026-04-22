import { useWallet, useWalletList } from '@meshsdk/react';
import { IconArrowLeft } from '@tabler/icons-react';
import type { Wallet } from '@meshsdk/common';
import { useOnboardingStore } from '@/store/onboarding-state';

export function SelectWalletStep() {
  const { connect } = useWallet();
  const wallets = useWalletList();
  const { setStep } = useOnboardingStore();

  function handleSelect(walletName: string) {
    setStep('connecting');
    connect(walletName)
      .then(() => {
        // useWalletSync will populate the store; we proceed after a short delay
        // to let the sync happen, then check if user is first-time
        setTimeout(() => setStep('profile-setup'), 1500);
      })
      .catch((err) => {
        console.error('Wallet connect failed:', err);
        setStep('select-wallet');
      });
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
        Select a Cardano wallet provider to continue.
      </p>

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
              className="flex w-full items-center gap-3 rounded-xl border border-border-subtle bg-surface-inset px-4 py-3.5 transition-all hover:border-brand-cyan/30 hover:bg-surface-overlay hover:shadow-sm hover:shadow-brand-cyan/5"
            >
              <img
                src={w.icon}
                alt={w.name}
                className="h-8 w-8 rounded-lg"
              />
              <span className="text-sm font-medium text-slate-200">
                {w.name}
              </span>
              <span className="ml-auto text-xs text-slate-500">Connect</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
