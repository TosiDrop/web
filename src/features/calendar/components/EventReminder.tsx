import { useId, useState } from 'react';
import { IconBell } from '@tabler/icons-react';
import { REMINDER_CAPACITY_ERRORS, type CalendarEvent } from '@/shared/calendar';
import { ApiError } from '@/types/api';
import { apiClient } from '@/api/client';
import { GradientButton } from '@/components/common/GradientButton';
import { useReminderConfig } from '../api/calendar.queries';
import { useCalendarReminders, type PendingCalendarReminder } from '../hooks/useCalendarReminders';

function pushSupported(): boolean {
  return typeof window.Notification !== 'undefined' && typeof window.PushManager !== 'undefined' && 'serviceWorker' in navigator;
}
function decodePublicKey(value: string): Uint8Array<ArrayBuffer> {
  const encoded = value.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(encoded + '='.repeat((4 - encoded.length % 4) % 4)), (char) => char.charCodeAt(0));
  if (bytes.length !== 65 || bytes[0] !== 4) throw new Error('Invalid push configuration');
  return bytes;
}
async function activeRegistration(registration: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  if (registration.active) return registration;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Service worker timed out')), 8000); })]);
  } finally { if (timer) clearTimeout(timer); }
}

export function EventReminder({ event }: { event: CalendarEvent }) {
  const id = useId();
  const config = useReminderConfig();
  const saved = useCalendarReminders(event.id);
  const [openedAt] = useState(() => Date.now());
  const [offset, setOffset] = useState<0 | 15 | 60 | 1440>(() => (saved.pending?.submitted ? saved.pending.remindBeforeMinutes : undefined) ?? (Date.parse(event.startsAt) - 15 * 60_000 > openedAt ? 15 : 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const supported = pushSupported();
  const denied = supported && Notification.permission === 'denied';
  const available = config.data?.available === true && !!config.data.publicKey;
  const past = Date.parse(event.startsAt) <= openedAt;
  const enable = async () => {
    setError(''); setMessage('');
    if (!supported || !available || !config.data?.publicKey) return;
    setBusy(true);
    let pending: PendingCalendarReminder | null = null;
    let submitted = false;
    try {
      const key = decodePublicKey(config.data.publicKey);
      try { pending = saved.prepare(offset); submitted = pending.submitted; setOffset(pending.remindBeforeMinutes); }
      catch { setError('Your browser storage could not save a reminder recovery key. Enable storage and retry, or add this event to your calendar instead.'); return; }
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') { setError(permission === 'denied' ? 'Allow notifications in your browser’s site settings, then try again.' : 'Notification permission was dismissed. Choose Enable reminder when you are ready.'); return; }
      const registration = await activeRegistration(await navigator.serviceWorker.register('/reward-alert-sw.js', { scope: '/' }));
      let subscription = await registration.pushManager.getSubscription();
      if (subscription?.options.applicationServerKey) {
        const existing = new Uint8Array(subscription.options.applicationServerKey);
        if (existing.length !== key.length || existing.some((byte, index) => byte !== key[index])) {
          setError('This browser has an older notification subscription. Reset this site’s notification settings, then try again.'); return;
        }
      }
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      try { saved.markSubmitted(pending); }
      catch { setError('Your browser storage could not save the reminder submission state. Enable storage and retry, or add this event to your calendar instead.'); return; }
      submitted = true;
      const result = await apiClient.post<{ id: string; managementToken: string; scheduledAt: string }>('/api/rewardReminders', { eventId: event.id, remindBeforeMinutes: pending.remindBeforeMinutes, subscription: subscription.toJSON(), managementToken: pending.managementToken });
      if (!result || typeof result.id !== 'string' || !/^[A-Za-z0-9-]{1,80}$/.test(result.id) || typeof result.managementToken !== 'string' || result.managementToken !== pending.managementToken || !Number.isFinite(Date.parse(result.scheduledAt))) throw new Error('Invalid reminder acknowledgement');
      saved.store({ ...result, eventId: event.id });
    } catch (issue) {
      if (issue instanceof ApiError && [400, 404, 409, 429].includes(issue.status)) {
        const safeTimingRejection = issue.status === 400 && ['That reminder time is in the past', 'Choose an event within the next 93 days'].includes(issue.message);
        const capacityRejection = issue.status === 409 && Object.values(REMINDER_CAPACITY_ERRORS).some((message) => message === issue.message);
        if (pending && (safeTimingRejection || capacityRejection)) saved.clearRejected(pending);
        const recovery = issue.status === 409 && !capacityRejection ? ' Use the original browser’s saved reminder settings, or add this event to your calendar.' : '';
        setError(`${issue.message.slice(0, 300)}${recovery}`);
      } else {
        setError(submitted ? 'Your reminder could not be confirmed. Check your connection and retry to safely recover this request.' : 'Your browser could not start the reminder. Check notification settings, choose a time and try again.');
      }
    } finally {
      if (pending && !submitted) saved.clearRejected(pending);
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!saved.record) return;
    setError(''); setMessage(''); setBusy(true);
    try {
      const result = await apiClient.post<{ removed: boolean }>('/api/rewardReminders', { action: 'remove', id: saved.record.id, managementToken: saved.record.managementToken });
      if (result?.removed !== true) throw new Error('Removal not acknowledged');
      saved.store(null); setMessage('Reminder removed.');
    } catch { setError('Removal could not be confirmed. Your reminder settings are kept here so you can retry.'); }
    finally { setBusy(false); }
  };
  return (
    <section aria-labelledby={`${id}-heading`} className="mt-5 border-t border-border-subtle pt-5">
      <h4 id={`${id}-heading`} className="flex items-center gap-2 text-sm font-medium text-text-primary"><IconBell size={17} stroke={1.7} aria-hidden />Event reminder</h4>
      <p className="mt-2 text-xs leading-5 text-text-muted">Receive a browser notification for this event, even with TosiDrop closed. {event.certainty === 'estimated' ? 'This event time is an estimate and may change.' : 'Delivery depends on your browser and notification settings.'}</p>
      {saved.record ? <div className="mt-3 flex flex-wrap items-center gap-3"><p role="status" className="text-sm leading-6 text-text-secondary">Reminder set for <time dateTime={saved.record.scheduledAt}>{new Date(saved.record.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time> ({Intl.DateTimeFormat().resolvedOptions().timeZone})</p><GradientButton variant="secondary" disabled={busy} onClick={() => { void remove(); }}>{busy ? 'Removing…' : 'Remove reminder'}</GradientButton></div>
        : !supported ? <p className="mt-3 text-xs leading-5 text-text-muted">This browser does not support push reminders. You can add this event to your calendar instead.</p>
          : config.isPending ? <p role="status" className="mt-3 text-xs text-text-muted">Checking reminder availability…</p>
            : config.error ? <div className="mt-3"><p className="text-xs text-text-muted">Reminder availability could not be checked.</p><GradientButton variant="ghost" onClick={() => { void config.refetch(); }}>Retry reminder check</GradientButton></div>
              : !available ? <p className="mt-3 text-xs leading-5 text-text-muted">Reminders are unavailable on this site. You can add this event to your calendar instead.</p>
                : denied ? <div className="mt-3"><p className="text-xs leading-5 text-text-muted">Allow notifications in your browser’s site settings, then return here to enable a reminder.</p><GradientButton variant="ghost" onClick={() => setMessage(Notification.permission === 'denied' ? 'Notifications are still blocked in your browser’s site settings.' : 'Notification permission updated. Choose Enable reminder to continue.')}>Check notification permission</GradientButton></div>
                  : past && !saved.pending?.submitted ? <p className="mt-3 text-xs text-text-muted">This event has started. Choose an upcoming event for a reminder.</p>
                    : <div className="mt-4 flex flex-wrap items-end gap-3"><label htmlFor={`${id}-offset`} className="min-w-0 text-xs text-text-secondary">Remind me<select id={`${id}-offset`} value={offset} disabled={busy || !!saved.pending?.submitted} onChange={(change) => setOffset(Number(change.target.value) as 0 | 15 | 60 | 1440)} className="mt-2 block h-11 w-full rounded-xl border border-border-subtle bg-surface-inset px-3 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent"><option value={0}>At the event time</option><option value={15} disabled={Date.parse(event.startsAt) - 15 * 60_000 <= openedAt}>15 minutes before</option><option value={60} disabled={Date.parse(event.startsAt) - 60 * 60_000 <= openedAt}>1 hour before</option><option value={1440} disabled={Date.parse(event.startsAt) - 1440 * 60_000 <= openedAt}>1 day before</option></select></label><GradientButton disabled={busy} onClick={() => { void enable(); }}>{busy ? 'Saving reminder…' : 'Enable reminder'}</GradientButton></div>}
      {saved.pending?.submitted && !saved.record && <p role="status" className="mt-3 text-xs leading-5 text-text-muted">A reminder request is waiting for confirmation. Retry with the saved time to safely recover it.</p>}
      {saved.warning && <p role="status" className="mt-3 text-xs leading-5 text-status-pending-light">{saved.warning}</p>}
      {error && <p role="alert" className="mt-3 text-xs leading-5 text-status-error-light">{error}</p>}
      {message && <p role="status" className="mt-3 text-xs text-text-secondary">{message}</p>}
    </section>
  );
}
