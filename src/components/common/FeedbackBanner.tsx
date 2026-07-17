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
    box: 'bg-[#EF4444]/[0.12] text-[#F87171]',
    border: 'border-[#EF4444]/20',
    message: 'text-[#D8AFAF]',
  },
  success: {
    icon: IconCircleCheck,
    box: 'bg-[#4ADE80]/[0.12] text-[#4ADE80]',
    border: 'border-[#4ADE80]/20',
    message: 'text-[#A9C8B4]',
  },
  info: {
    icon: IconInfoCircle,
    box: 'bg-accent/[0.12] text-accent-light',
    border: 'border-accent/25',
    message: 'text-[#9FA1C2]',
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
      className={`flex items-start gap-3 rounded-2xl border ${style.border} bg-[linear-gradient(180deg,#161B2E,#121726)] px-4 py-3.5`}
    >
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] ${style.box}`}>
        <Icon size={17} stroke={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="text-[14px] font-semibold text-[#EDEEF2]">{title}</p>}
        <p className={`text-[12.5px] ${style.message} ${title ? 'mt-0.5' : ''}`}>{message}</p>
      </div>
    </div>
  );
}
