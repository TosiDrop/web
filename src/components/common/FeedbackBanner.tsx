interface FeedbackBannerProps {
  tone?: 'error' | 'success' | 'info';
  title?: string;
  message: string;
}

const toneClasses: Record<
  NonNullable<FeedbackBannerProps['tone']>,
  string
> = {
  error: 'border-l-red-500 text-red-200',
  success: 'border-l-emerald-500 text-emerald-200',
  info: 'border-l-brand-cyan text-slate-300',
};

const ariaRoles: Record<NonNullable<FeedbackBannerProps['tone']>, 'alert' | 'status'> = {
  error: 'alert',
  success: 'status',
  info: 'status',
};

export function FeedbackBanner({
  tone = 'info',
  title,
  message,
}: FeedbackBannerProps) {
  return (
    <div
      role={ariaRoles[tone]}
      className={`rounded-lg border-l-2 bg-surface-raised px-4 py-3 ${toneClasses[tone]}`}
    >
      {title && <p className="text-sm font-medium text-white">{title}</p>}
      <p className="text-sm">{message}</p>
    </div>
  );
}
