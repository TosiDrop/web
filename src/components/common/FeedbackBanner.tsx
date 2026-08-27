import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  type Icon,
} from '@tabler/icons-react';

interface FeedbackBannerProps {
  tone?: 'error' | 'success' | 'info';
  title?: string;
  message: string;
}

interface ToneStyle {
  icon: Icon;
  box: string;
  border: string;
  message: string;
}

const toneStyles: Record<NonNullable<FeedbackBannerProps['tone']>, ToneStyle> = {
  error: {
    icon: IconAlertTriangle,
    box: 'bg-status-error/[0.12] text-status-error-light',
    border: 'border-status-error/20',
    message: 'text-status-error-light',
  },
  success: {
    icon: IconCircleCheck,
    box: 'bg-status-success/[0.12] text-status-success-light',
    border: 'border-status-success/20',
    message: 'text-status-success-light',
  },
  info: {
    icon: IconInfoCircle,
    box: 'bg-accent/[0.12] text-accent-light',
    border: 'border-accent/25',
    message: 'text-accent-light',
  },
};

const ariaRoles: Record<NonNullable<FeedbackBannerProps['tone']>, 'alert' | 'status'> = {
  error: 'alert',
  success: 'status',
  info: 'status',
};

export function FeedbackBanner({ tone = 'info', title, message }: FeedbackBannerProps) {
  const style = toneStyles[tone];
  const Icon = style.icon;

  return (
    <div
      role={ariaRoles[tone]}
      className={`card-premium flex items-start gap-3 ${style.border} px-4 py-3.5`}
    >
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${style.box}`}>
        <Icon size={17} stroke={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold text-text-primary">{title}</p>}
        <p className={`text-xs ${title ? 'mt-0.5 text-text-secondary' : style.message}`}>{message}</p>
      </div>
    </div>
  );
}
