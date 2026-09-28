import { useCallback, useState, type ReactNode } from 'react';
import { MobileMenuContext } from './MobileMenuContext';

/** Provides shared open and close state for responsive navigation. */
export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <MobileMenuContext.Provider value={{ isOpen, open, close }}>
      {children}
    </MobileMenuContext.Provider>
  );
}
