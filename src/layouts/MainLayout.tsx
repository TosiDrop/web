import { lazy, Suspense, type ReactNode } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MobileMenuProvider } from './MobileMenuContext';
import { NetworkMismatchBanner } from '@/features/wallet/components/NetworkMismatchBanner';
import { useFirstTimeCheck } from '@/features/onboarding/hooks/useFirstTimeCheck';
import { useOnboardingStore } from '@/store/onboarding-state';
import { useWalletStore } from '@/store/wallet-state';
import { Toaster } from '@/components/common/Toaster';

const WalletRuntime = lazy(() => import('@/features/wallet/WalletRuntime'));

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
          <div className="relative min-h-screen bg-[radial-gradient(1100px_420px_at_82%_-6%,rgba(34,211,238,0.045),transparent_70%)]">
            <TopBar />
            <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-9 lg:py-10">
              <NetworkMismatchBanner />
              {children}
            </main>
          </div>
        </div>
      </div>
      {(modalOpen || runtimeWanted) && (
        <Suspense fallback={null}>
          <WalletRuntime />
        </Suspense>
      )}
      <Toaster />
    </MobileMenuProvider>
  );
}
