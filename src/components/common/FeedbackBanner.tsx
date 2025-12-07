interface FeedbackBannerProps {
  tone?: 'error' | 'success' | 'info';
  title?: string;
  message: string;
}

const toneClasses: Record<
  NonNullable<FeedbackBannerProps['tone']>,
  string
> = {
  error: 'border-red-500 bg-red-500/10 text-red-200',
  success: 'border-green-500 bg-green-500/10 text-green-200',
  info: 'border-blue-500 bg-blue-500/10 text-blue-200',
};

export const FeedbackBanner = ({
  tone = 'info',
  title,
  message,
}: FeedbackBannerProps) => {
  const classes = toneClasses[tone];

  return (
    <div className={`rounded-xl border p-4 ${classes}`}>
      {title && <p className="font-semibold">{title}</p>}
      <p>{message}</p>
    </div>
  );
};

