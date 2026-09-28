import { useContext } from 'react';
import { MobileMenuContext } from './MobileMenuContext';

/** Reads responsive navigation state and requires a MobileMenuProvider ancestor. */
export function useMobileMenu() {
  const ctx = useContext(MobileMenuContext);
  if (!ctx) throw new Error('useMobileMenu must be used within MobileMenuProvider');
  return ctx;
}
