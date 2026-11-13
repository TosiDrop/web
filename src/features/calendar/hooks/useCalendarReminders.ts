import { useState } from 'react';
import { DEPLOYMENT_NETWORK } from '@/config/network';

export interface SavedCalendarReminder { eventId: string; id: string; managementToken: string; scheduledAt: string }
export type ReminderOffset = 0 | 15 | 60 | 1440;
export interface PendingCalendarReminder { eventId: string; remindBeforeMinutes: ReminderOffset; managementToken: string; submitted: boolean }
export const reminderStorageKey = () => `tosidrop-calendar-reminders:v1:${DEPLOYMENT_NETWORK}`;
export const pendingReminderStorageKey = () => `tosidrop-calendar-reminder-pending:v1:${DEPLOYMENT_NETWORK}`;
const pendingKey = (eventId: string, offset: ReminderOffset) => JSON.stringify([eventId, offset]);
const validToken = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
// Preserve completed capabilities across collapsed rows if a later persistence write fails.
const session = new Map<string, SavedCalendarReminder | null>();
const sessionWarnings = new Map<string, string>();
function storedObject(key: string): Record<string, unknown> {
  const raw = window.localStorage.getItem(key);
  if (raw === null) return Object.create(null) as Record<string, unknown>;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid reminder settings');
  return value as Record<string, unknown>;
}
function recordsFromStorage(): Record<string, SavedCalendarReminder> {
  const records = Object.create(null) as Record<string, SavedCalendarReminder>;
  for (const [eventId, entry] of Object.entries(storedObject(reminderStorageKey()))) {
    const record = entry as Partial<SavedCalendarReminder> | null;
    if (!record || typeof record !== 'object' || record.eventId !== eventId || typeof record.id !== 'string' || !/^[A-Za-z0-9-]{1,80}$/.test(record.id) || !validToken(record.managementToken) || typeof record.scheduledAt !== 'string' || !Number.isFinite(Date.parse(record.scheduledAt))) throw new Error('Invalid reminder settings');
    records[eventId] = record as SavedCalendarReminder;
  }
  return records;
}
function pendingFromStorage(): Record<string, PendingCalendarReminder> {
  const records = Object.create(null) as Record<string, PendingCalendarReminder>;
  for (const [key, entry] of Object.entries(storedObject(pendingReminderStorageKey()))) {
    const record = entry as Partial<PendingCalendarReminder> | null;
    if (!record || typeof record !== 'object' || typeof record.eventId !== 'string' || ![0, 15, 60, 1440].includes(record.remindBeforeMinutes as number) || !validToken(record.managementToken) || (record.submitted !== undefined && typeof record.submitted !== 'boolean') || key !== pendingKey(record.eventId, record.remindBeforeMinutes as ReminderOffset)) throw new Error('Invalid pending reminder settings');
    // Entries from the previous format may already have reached the server.
    records[key] = { ...record, submitted: record.submitted ?? true } as PendingCalendarReminder;
  }
  return records;
}
interface ReminderSnapshot { record: SavedCalendarReminder | null; pending: PendingCalendarReminder | null; warning: string }
function read(eventId: string): ReminderSnapshot {
  try {
    const records = recordsFromStorage();
    const pending = Object.values(pendingFromStorage()).find((entry) => entry.eventId === eventId) ?? null;
    return { record: session.has(eventId) ? session.get(eventId)! : records[eventId] ?? null, pending, warning: sessionWarnings.get(eventId) ?? '' };
  } catch { return { record: session.get(eventId) ?? null, pending: null, warning: 'Saved reminder settings could not be read on this device.' }; }
}
export function useCalendarReminders(eventId: string) {
  const [state, setState] = useState(() => ({ eventId, ...read(eventId) }));
  const current = state.eventId === eventId ? state : read(eventId);
  const prepare = (offset: ReminderOffset): PendingCalendarReminder => {
    // Persist and read back the capability before permission, subscription or POST.
    // A lost response can then recover the same server record after reload.
    recordsFromStorage();
    const all = pendingFromStorage();
    const existing = Object.values(all).find((entry) => entry.eventId === eventId && entry.submitted)
      ?? Object.values(all).find((entry) => entry.eventId === eventId && entry.remindBeforeMinutes === offset);
    for (const [key, draft] of Object.entries(all)) {
      if (draft.eventId === eventId && !draft.submitted && draft !== existing) delete all[key];
    }
    const pending = existing ?? { eventId, remindBeforeMinutes: offset, submitted: false, managementToken: Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('') };
    const key = pendingKey(eventId, pending.remindBeforeMinutes);
    all[key] = pending;
    window.localStorage.setItem(pendingReminderStorageKey(), JSON.stringify(all));
    if (pendingFromStorage()[key]?.managementToken !== pending.managementToken) throw new Error('Reminder capability could not be verified');
    setState({ ...current, eventId, pending });
    return pending;
  };
  const markSubmitted = (pending: PendingCalendarReminder) => {
    const all = pendingFromStorage();
    const key = pendingKey(eventId, pending.remindBeforeMinutes);
    if (all[key]?.managementToken !== pending.managementToken) throw new Error('Reminder recovery key changed');
    const submitted = { ...pending, submitted: true };
    all[key] = submitted;
    window.localStorage.setItem(pendingReminderStorageKey(), JSON.stringify(all));
    const verified = pendingFromStorage()[key];
    if (verified?.managementToken !== pending.managementToken || !verified.submitted) throw new Error('Submission state could not be saved');
    setState((latest) => ({ ...latest, eventId, pending: submitted }));
  };
  // Only call after definite pre-POST failure or an authoritative rejection that
  // confirms this capability has no existing server record.
  const clearRejected = (pending: PendingCalendarReminder) => {
    try {
      const all = pendingFromStorage();
      const key = pendingKey(eventId, pending.remindBeforeMinutes);
      if (all[key]?.managementToken === pending.managementToken) delete all[key];
      window.localStorage.setItem(pendingReminderStorageKey(), JSON.stringify(all));
      if (pendingFromStorage()[key]?.managementToken === pending.managementToken) throw new Error('Draft could not be cleared');
      setState((latest) => ({ ...latest, eventId, pending: Object.values(all).find((entry) => entry.eventId === eventId) ?? null }));
    } catch {
      setState((latest) => ({ ...latest, warning: 'This device could not clear the draft reminder settings. Enable browser storage and retry.' }));
    }
  };
  const store = (record: SavedCalendarReminder | null) => {
    const capability = record?.managementToken ?? current.record?.managementToken;
    session.set(eventId, record);
    let warning = '';
    try {
      const all = recordsFromStorage();
      for (const [id, saved] of session) { if (saved) all[id] = saved; else delete all[id]; }
      window.localStorage.setItem(reminderStorageKey(), JSON.stringify(all));
      // Clear only the acknowledged capability; unrelated pending requests survive.
      const pending = pendingFromStorage();
      for (const [key, entry] of Object.entries(pending)) {
        if (entry.eventId === eventId && entry.managementToken === capability) delete pending[key];
      }
      window.localStorage.setItem(pendingReminderStorageKey(), JSON.stringify(pending));
    } catch {
      warning = record
        ? 'Your reminder is saved on the server. Its recovery key is retained; this device could not update its saved settings.'
        : 'The reminder was removed. This device could not update its saved settings.';
    }
    sessionWarnings.set(eventId, warning);
    setState({ eventId, record, pending: null, warning });
  };
  return { ...current, prepare, markSubmitted, clearRejected, store };
}
