import { lazy, Suspense, type ReactNode } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MobileMenuProvider } from './MobileMenuContext';
import { NetworkMismatchBanner } from '@/features/wallet/components/NetworkMismatchBanner';
import { useFirstTimeCheck } from '@/features/onboarding/hooks/useFirstTimeCheck';
import { useOnboardingStore } from '@/store/onboarding-state';
import { useWalletStore } from '@/store/wallet-state';
import { Toaster } from '@/components/common/Toaster';

import { preloadWalletRuntime } from '@/features/wallet/preload';

const WalletRuntime = lazy(preloadWalletRuntime);

/** Shown only while a user-initiated connect is waiting on the wallet chunk. */
function WalletLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border-default bg-surface-raised px-5 py-4 text-sm text-text-secondary shadow-pop">
        <span
          aria-hidden
          className="inline-block h-4 w-4 animate-[tdspin_0.8s_linear_infinite] rounded-full border-2 border-white/15 border-t-accent-light"
        />
        Loading wallet…
      </div>
    </div>
  );
}

export function MainLayout({ children }: { children: ReactNode }) {
  useFirstTimeCheck();
  const modalOpen = useOnboardingStore((s) => s.isOpen);
  const runtimeWanted = useWalletStore((s) => s.runtimeWanted);

  return (
    <MobileMenuProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-lg focus:bg-surface-overlay focus:px-4 focus:py-2 focus:text-sm focus:text-text-primary"
      >
        Skip to content
      </a>
      <div className="min-h-screen bg-surface-base text-text-secondary">
        <Sidebar />
        <div className="lg:ml-60">
          <div className="relative min-h-screen">
            <TopBar />
            <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-9 lg:py-10">
              <NetworkMismatchBanner />
              {children}
            </main>
          </div>
        </div>
      </div>
      {(modalOpen || runtimeWanted) && (
        <Suspense fallback={modalOpen ? <WalletLoading /> : null}>
          <WalletRuntime />
        </Suspense>
      )}
      <Toaster />
    </MobileMenuProvider>
  );
}
