import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export const SectionCard = ({
  title,
  description,
  actions,
  className,
  children,
}: SectionCardProps) => {
  const hasHeader = title || description || actions;

  return (
    <section
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur',
        className
      )}
    >
      {hasHeader && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-xl font-semibold text-white">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-gray-300">{description}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
};

