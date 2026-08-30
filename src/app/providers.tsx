import { useEffect, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MeshProvider } from '@meshsdk/react';
import { MotionConfig } from 'motion/react';
import { queryClient } from '@/api/queryClient';
import { applyThemeClass, useThemeStore } from '@/store/theme-state';

interface AppProvidersProps {
  children: ReactNode;
}

function ThemeRoot({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);
  return <>{children}</>;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <MeshProvider>
          <ThemeRoot>{children}</ThemeRoot>
        </MeshProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
