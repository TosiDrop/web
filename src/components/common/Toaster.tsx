import { AnimatePresence, motion } from 'motion/react';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconX,
  type Icon,
} from '@tabler/icons-react';
import { useToastStore, type ToastTone } from '@/store/toast-state';

const TONE: Record<ToastTone, { icon: Icon; box: string; border: string }> = {
  error: {
    icon: IconAlertTriangle,
    box: 'bg-[#EF4444]/[0.12] text-[#F87171]',
    border: 'border-[#EF4444]/25',
  },
  success: {
    icon: IconCircleCheck,
    box: 'bg-[#22C55E]/[0.12] text-[#4ADE80]',
    border: 'border-[#22C55E]/25',
  },
  info: {
    icon: IconInfoCircle,
    box: 'bg-accent/[0.12] text-accent-light',
    border: 'border-accent/25',
  },
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-2.5">
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
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border ${tone.border} bg-[linear-gradient(180deg,#161B2E,#121726)] px-4 py-3.5 shadow-2xl shadow-black/50`}
              role="status"
            >
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] ${tone.box}`}
              >
                <Icon size={17} stroke={1.8} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                {t.title && (
                  <p className="text-[13.5px] font-semibold text-[#EDEEF2]">{t.title}</p>
                )}
                <p className={`text-[12.5px] text-[#9AA0AE] ${t.title ? 'mt-0.5' : ''}`}>
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="-mr-1 -mt-0.5 rounded-md p-1 text-[#5A6075] transition hover:text-slate-200"
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
