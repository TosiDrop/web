export interface FeedbackDetails {
  category: string;
  message: string;
  email?: string;
}

// The recipient is intentionally configurable until TosiDrop publishes a
// canonical support mailbox for the new web app.
const FEEDBACK_EMAIL = import.meta.env.VITE_FEEDBACK_EMAIL ?? 'support@tosidrop.me';

export const SUPPORT_LINKS = [
  { label: 'Discord', href: 'https://discord.gg/tosidrop' },
  { label: 'Documentation', href: 'https://docs.tosidrop.me/' },
  { label: 'GitHub', href: 'https://github.com/TosiDrop' },
  { label: 'X', href: 'https://x.com/tosidrop' },
] as const;

export function isSafeExternalUrl(href: string): boolean {
  try {
    return new URL(href).protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildFeedbackMailto({ category, message, email }: FeedbackDetails): string {
  const body = [`Category: ${category}`, '', message, email ? `\nReply-to: ${email}` : '']
    .filter(Boolean)
    .join('\n');
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(`TosiDrop feedback: ${category}`)}&body=${encodeURIComponent(body)}`;
}
