import type { ReactNode } from 'react';
import { PrimaryNavigation } from './components/PrimaryNavigation';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white">
      <PrimaryNavigation />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-10">
        {children}
      </main>
    </div>
  );
};

