import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface MobileMenuContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function useMobileMenu(): MobileMenuContextValue {
  const ctx = useContext(MobileMenuContext);
  if (!ctx) {
    throw new Error('useMobileMenu must be used within MobileMenuProvider');
  }
  return ctx;
}

interface MobileMenuProviderProps {
  children: ReactNode;
}

export function MobileMenuProvider({ children }: MobileMenuProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <MobileMenuContext.Provider value={{ isOpen, open, close }}>
      {children}
    </MobileMenuContext.Provider>
  );
}
