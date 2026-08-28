import type { ReactNode } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MobileMenuProvider } from './MobileMenuContext';
import { useWalletSync } from '@/features/wallet/hooks/useWalletSync';
import { NetworkMismatchBanner } from '@/features/wallet/components/NetworkMismatchBanner';
import { OnboardingModal } from '@/features/onboarding/components/OnboardingModal';
import { useFirstTimeCheck } from '@/features/onboarding/hooks/useFirstTimeCheck';
import { Toaster } from '@/components/common/Toaster';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  useWalletSync();
  useFirstTimeCheck();

  return (
    <MobileMenuProvider>
      <div className="min-h-screen bg-surface-base text-slate-200">
        <Sidebar />
        <div className="lg:ml-60">
          {/* Soft indigo glow bleeding from the top-right of the work area */}
          <div className="relative min-h-screen bg-[radial-gradient(1100px_420px_at_82%_-6%,rgba(34,211,238,0.045),transparent_70%)]">
            <TopBar />
            <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-9 lg:py-10">
              <NetworkMismatchBanner />
              {children}
            </main>
          </div>
        </div>
      </div>
      <OnboardingModal />
      <Toaster />
    </MobileMenuProvider>
  );
}
