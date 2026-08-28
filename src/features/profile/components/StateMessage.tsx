import { Card } from '@/components/common/Card';

export function StateMessage({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <Card variant="inset" className="px-6 py-16 text-center">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-text-muted">{message}</p>
      {children}
    </Card>
  );
}
