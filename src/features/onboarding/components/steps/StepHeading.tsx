import { useEffect, useRef, type ReactNode } from 'react';

/** Step heading that takes focus on mount so keyboard/SR users land on the new step. */
export function StepHeading({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <h2 ref={ref} tabIndex={-1} className={className}>
      {children}
    </h2>
  );
}
