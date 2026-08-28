import { AnimatePresence, motion } from 'motion/react';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconX,
  type Icon,
} from '@tabler/icons-react';
import { useToastStore, type ToastTone } from '@/store/toast-state';

const TONE: Record<ToastTone, { icon: Icon; color: string; border: string }> = {
  error: {
    icon: IconAlertTriangle,
    color: 'text-status-error-light',
    border: 'border-status-error/25',
  },
  success: {
    icon: IconCircleCheck,
    color: 'text-status-success-light',
    border: 'border-status-success/25',
  },
  info: {
    icon: IconInfoCircle,
    color: 'text-accent-light',
    border: 'border-accent/25',
  },
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-3"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const tone = TONE[t.tone];
          const Icon = tone.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.98 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={`card-premium pointer-events-auto flex items-start gap-3 ${tone.border} px-4 py-3.5 shadow-pop`}
              role={t.tone === 'error' ? 'alert' : undefined}
            >
              <Icon size={18} stroke={1.8} className={`mt-0.5 flex-shrink-0 ${tone.color}`} aria-hidden />
              <div className="min-w-0 flex-1 pt-0.5">
                {t.title && (
                  <p className="text-md font-semibold text-text-primary">{t.title}</p>
                )}
                <p className={`text-xs text-text-secondary ${t.title ? 'mt-0.5' : ''}`}>
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="-m-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:text-text-primary"
              >
                <IconX size={15} stroke={1.8} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
