import { createContext } from 'react';

export interface MobileMenuContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);
