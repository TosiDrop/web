import { create } from 'zustand';

export type ToastTone = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  title?: string;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => number;
  dismiss: (id: number) => void;
}

let counter = 0;
const TIMEOUT_MS = 4500;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = (counter += 1);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, TIMEOUT_MS);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/** Imperative helper so non-component code can fire toasts. */
export const toast = {
  error: (message: string, title?: string) =>
    useToastStore.getState().push({ tone: 'error', message, title }),
  success: (message: string, title?: string) =>
    useToastStore.getState().push({ tone: 'success', message, title }),
  info: (message: string, title?: string) =>
    useToastStore.getState().push({ tone: 'info', message, title }),
};
