import { useEffect, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { queryClient } from '@/api/queryClient';
import { applyThemeClass, useThemeStore } from '@/store/theme-state';

function ThemeRoot({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);
  return <>{children}</>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <ThemeRoot>{children}</ThemeRoot>
      </MotionConfig>
    </QueryClientProvider>
  );
}
