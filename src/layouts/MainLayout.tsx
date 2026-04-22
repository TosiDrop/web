import type { ReactNode } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MobileMenuProvider } from './MobileMenuContext';
import { useWalletSync } from '@/features/wallet/hooks/useWalletSync';
import { OnboardingModal } from '@/features/onboarding/components/OnboardingModal';
import { useFirstTimeCheck } from '@/features/onboarding/hooks/useFirstTimeCheck';

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
        <div className="lg:ml-56">
          <TopBar />
          <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
            {children}
          </main>
        </div>
      </div>
      <OnboardingModal />
    </MobileMenuProvider>
  );
}
