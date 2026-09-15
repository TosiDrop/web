import { useState, type FormEvent } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { IconArrowUpRight, IconHelpCircle, IconSend, IconX } from '@tabler/icons-react';
import { buildFeedbackMailto, isSafeExternalUrl, SUPPORT_LINKS } from '@/config/support';

const inputClass =
  'mt-1.5 w-full rounded-lg border border-border-default bg-surface-inset px-3 py-2.5 text-sm text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none';

export function Footer() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('General feedback');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.location.assign(buildFeedbackMailto({ category, message, email: email || undefined }));
    setOpen(false);
  };

  return (
    <>
      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-4 border-t border-border-subtle px-5 py-6 text-xs lg:flex-row lg:items-center lg:justify-between lg:px-9">
        <div>
          <p className="font-medium text-text-secondary">Need a hand?</p>
          <p className="mt-1 text-text-muted">Share feedback or find the TosiDrop community.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 font-medium text-accent-light transition hover:text-text-primary"
          >
            <IconHelpCircle size={15} stroke={1.8} aria-hidden />
            Send feedback
          </button>
          {SUPPORT_LINKS.filter((link) => isSafeExternalUrl(link.href)).map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-text-muted transition hover:text-text-primary"
            >
              {link.label}
              <IconArrowUpRight size={12} stroke={1.8} aria-hidden />
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          ))}
        </div>
      </footer>

      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-lg rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-pop">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-semibold text-text-primary">Send feedback</DialogTitle>
                <p className="mt-1 text-sm text-text-muted">Tell us what would make token distribution better.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close feedback form" className="rounded-lg p-1 text-text-muted hover:bg-white/[0.05] hover:text-text-primary">
                <IconX size={18} aria-hidden />
              </button>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-xs font-medium text-text-secondary">
                Topic
                <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>
                  <option>General feedback</option>
                  <option>Bug report</option>
                  <option>Token distribution</option>
                  <option>Wallet or claim</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-text-secondary">
                Message
                <textarea required minLength={10} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What happened, or what should we improve?" className={inputClass} />
              </label>
              <label className="block text-xs font-medium text-text-secondary">
                Email <span className="font-normal text-text-muted">(optional)</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className={inputClass} />
              </label>
              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="text-2xs text-text-muted">Your email app will open with the message ready to send.</p>
                <button type="submit" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast transition hover:bg-accent-light">
                  <IconSend size={15} stroke={1.8} aria-hidden />
                  Open email
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
