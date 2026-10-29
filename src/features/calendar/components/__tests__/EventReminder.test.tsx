import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventReminder } from '../EventReminder';
import { REMINDER_CAPACITY_ERRORS, type CalendarEvent } from '@/shared/calendar';
import { ApiError } from '@/types/api';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { pendingReminderStorageKey, reminderStorageKey } from '../../hooks/useCalendarReminders';

const { configMock, postMock, requestMock, registerMock, subscribeMock } = vi.hoisted(() => ({ configMock: vi.fn(), postMock: vi.fn(), requestMock: vi.fn(), registerMock: vi.fn(), subscribeMock: vi.fn() }));
vi.mock('../../api/calendar.queries', () => ({ useReminderConfig: configMock }));
vi.mock('@/api/client', () => ({ apiClient: { post: postMock } }));
let sequence = 0;
const event: CalendarEvent = { id: 'epoch:123', title: 'Next epoch', startsAt: '2099-11-01T00:00:00Z', endsAt: null, certainty: 'estimated', kind: 'epoch', projectId: null, projectName: null, tokenId: null, description: '', url: '/calendar' };
const saved = { id: 'reminder-123', managementToken: 'a'.repeat(64), scheduledAt: '2099-10-31T23:00:00Z' };
const keyBytes = Uint8Array.from([4, ...Array<number>(64).fill(2)]);
const publicKey = btoa(String.fromCharCode(...keyBytes));
const permission = (value: string) => { Object.defineProperty(window.Notification, 'permission', { configurable: true, value }); };
const mockBrowser = () => {
  vi.stubGlobal('Notification', { permission: 'default', requestPermission: requestMock });
  vi.stubGlobal('PushManager', class {});
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: registerMock } });
};

describe('EventReminder', () => {
  beforeEach(() => {
    postMock.mockReset();
    localStorage.clear(); event.startsAt = '2099-11-01T00:00:00Z'; event.id = `epoch:test-${++sequence}`; mockBrowser();
    configMock.mockReturnValue({ data: { available: true, publicKey }, isPending: false, error: null, refetch: vi.fn() });
    requestMock.mockResolvedValue('granted');
    subscribeMock.mockResolvedValue({ toJSON: () => ({ endpoint: 'https://push.example.test/secret', keys: { p256dh: 'secret', auth: 'secret' } }) });
    registerMock.mockResolvedValue({ active: {}, pushManager: { getSubscription: vi.fn().mockResolvedValue(null), subscribe: subscribeMock } });
    postMock.mockImplementation((_url: string, body: { managementToken: string }) => Promise.resolve({ ...saved, managementToken: body.managementToken }));
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
  it('explains unsupported browsers and requests no permission on mount', () => {
    vi.stubGlobal('PushManager', undefined);
    render(<EventReminder event={event} />);
    expect(screen.getByText(/This browser does not support push reminders/)).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalled(); expect(registerMock).not.toHaveBeenCalled();
  });
  it('reports unconfigured reminders and blocked permission', () => {
    configMock.mockReturnValue({ data: { available: false, publicKey: null }, isPending: false });
    const view = render(<EventReminder event={event} />);
    expect(screen.getByText(/Reminders are unavailable on this site/)).toBeInTheDocument();
    configMock.mockReturnValue({ data: { available: true, publicKey }, isPending: false }); permission('denied');
    view.rerender(<EventReminder event={event} />);
    expect(screen.getByText(/Allow notifications in your browser’s site settings/)).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalled();
  });
  it('enrolls only on click, displays server time and removes after acknowledgement', async () => {
    render(<EventReminder event={event} />);
    expect(requestMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Remind me' }), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByText(/Reminder set for/)).toBeInTheDocument();
    expect(registerMock).toHaveBeenCalledWith('/reward-alert-sw.js', { scope: '/' });
    expect(subscribeMock).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: keyBytes });
    expect(postMock).toHaveBeenCalledWith('/api/rewardReminders', expect.objectContaining({ eventId: event.id, remindBeforeMinutes: 60 }));
    const capability = postMock.mock.calls[0][1].managementToken as string;
    expect(capability).toMatch(/^[a-f0-9]{64}$/);
    expect(localStorage.getItem(reminderStorageKey())).toContain(capability);
    postMock.mockResolvedValueOnce({ removed: true });
    fireEvent.click(screen.getByRole('button', { name: 'Remove reminder' }));
    expect(await screen.findByText('Reminder removed.')).toBeInTheDocument();
    expect(postMock).toHaveBeenLastCalledWith('/api/rewardReminders', { action: 'remove', id: saved.id, managementToken: capability });
    expect(localStorage.getItem(reminderStorageKey())).not.toContain(capability);
  });
  it('handles denied permission and an enrollment API error without claiming success', async () => {
    requestMock.mockResolvedValueOnce('denied');
    const view = render(<EventReminder event={event} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Allow notifications');
    expect(postMock).not.toHaveBeenCalled();
    view.unmount(); render(<EventReminder event={event} />); permission('granted'); postMock.mockRejectedValueOnce(new Error('private endpoint'));
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be confirmed');
    expect(screen.queryByText(/Reminder set for/)).not.toBeInTheDocument();
    expect(screen.queryByText('private endpoint')).not.toBeInTheDocument();
  });
  it('keeps a dismissed permission draft editable after time advances and the row remounts', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2099-10-31T23:40:00Z'));
    requestMock.mockResolvedValueOnce('default');
    const view = render(<EventReminder event={event} />);
    expect(screen.getByRole('combobox', { name: 'Remind me' })).toHaveValue('15');
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('permission was dismissed');
    expect(screen.getByRole('combobox', { name: 'Remind me' })).toBeEnabled();
    expect(postMock).not.toHaveBeenCalled();
    view.unmount(); now.mockReturnValue(Date.parse('2099-10-31T23:50:00Z'));
    render(<EventReminder event={event} />);
    expect(screen.getByRole('combobox', { name: 'Remind me' })).toBeEnabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Remind me' }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByText(/Reminder set for/)).toBeInTheDocument();
    expect(postMock).toHaveBeenCalledWith('/api/rewardReminders', expect.objectContaining({ remindBeforeMinutes: 0 }));
  });
  it('keeps the time editable after a service worker error before POST', async () => {
    registerMock.mockRejectedValueOnce(new Error('worker unavailable'));
    render(<EventReminder event={event} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    await screen.findByRole('alert');
    expect(postMock).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'Remind me' })).toBeEnabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Remind me' }), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByText(/Reminder set for/)).toBeInTheDocument();
    expect(postMock).toHaveBeenCalledWith('/api/rewardReminders', expect.objectContaining({ remindBeforeMinutes: 60 }));
  });
  it('durably marks submission and unlocks a definitely rejected reminder time', async () => {
    postMock.mockImplementationOnce(() => {
      const pending = Object.values(JSON.parse(localStorage.getItem(pendingReminderStorageKey())!)) as Array<{ submitted: boolean }>;
      expect(pending.find((entry) => entry.submitted === true)).toBeDefined();
      throw new ApiError('That reminder time is in the past', 400);
    });
    render(<EventReminder event={event} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That reminder time is in the past');
    expect(screen.getByRole('combobox', { name: 'Remind me' })).toBeEnabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Remind me' }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByText(/Reminder set for/)).toBeInTheDocument();
  });
  it.each(['windowFull', 'windowTooShort'] as const)('unlocks the submitted offset after the %s capacity response', async (reason) => {
    postMock.mockRejectedValueOnce(new ApiError(REMINDER_CAPACITY_ERRORS[reason], 409));
    render(<EventReminder event={event} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(REMINDER_CAPACITY_ERRORS[reason]);
    expect(screen.getByRole('combobox', { name: 'Remind me' })).toBeEnabled();
    expect(localStorage.getItem(pendingReminderStorageKey())).not.toContain('managementToken');
    expect(screen.queryByText(/original browser’s saved reminder settings/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Remind me' }), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByText(/Reminder set for/)).toBeInTheDocument();
    expect(postMock).toHaveBeenLastCalledWith('/api/rewardReminders', expect.objectContaining({ remindBeforeMinutes: 60 }));
  });
  it('preserves a conflicting submitted capability and explains recovery', async () => {
    postMock.mockRejectedValueOnce(new ApiError('This reminder is already saved with a different browser capability', 409));
    render(<EventReminder event={event} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('different browser capability');
    expect(screen.getByRole('alert')).toHaveTextContent('original browser’s saved reminder settings');
    expect(screen.getByRole('combobox', { name: 'Remind me' })).toBeDisabled();
    expect(localStorage.getItem(pendingReminderStorageKey())).toContain('managementToken');
  });

  it('isolates saved capabilities by deployment network', () => {
    const other = DEPLOYMENT_NETWORK === 'mainnet' ? 'preview' : 'mainnet';
    localStorage.setItem(`tosidrop-calendar-reminders:v1:${other}`, JSON.stringify({ [event.id]: { ...saved, eventId: event.id } }));
    render(<EventReminder event={event} />);
    expect(screen.queryByText(/Reminder set for/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable reminder' })).toBeInTheDocument();
  });
  it('preserves corrupt local settings and blocks enrollment before requesting permission', async () => {
    localStorage.setItem(reminderStorageKey(), '{');
    render(<EventReminder event={event} />);
    expect(screen.getByText(/Saved reminder settings could not be read/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('browser storage');
    expect(localStorage.getItem(reminderStorageKey())).toBe('{');
    expect(requestMock).not.toHaveBeenCalled(); expect(postMock).not.toHaveBeenCalled();
  });
  it('blocks enrollment before permission or POST when a pending capability cannot persist', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<EventReminder event={event} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('browser storage');
    expect(screen.getByRole('alert')).toHaveTextContent('add this event to your calendar');
    expect(requestMock).not.toHaveBeenCalled(); expect(registerMock).not.toHaveBeenCalled(); expect(postMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Reminder set for/)).not.toBeInTheDocument();
  });
  it('retries a response-lost enrollment with the same durably saved capability after remount', async () => {
    let storedCapability = '';
    const serverRecords = new Map<string, typeof saved>();
    postMock.mockImplementation((_url: string, body: { managementToken: string }) => {
      const existing = serverRecords.get(body.managementToken);
      if (!existing) throw new Error('different capability');
      return Promise.resolve(existing);
    });
    const generate = vi.spyOn(crypto, 'getRandomValues');
    postMock.mockImplementationOnce((_url: string, body: { managementToken: string }) => {
      storedCapability = body.managementToken;
      serverRecords.set(storedCapability, { ...saved, managementToken: storedCapability });
      expect(localStorage.getItem(pendingReminderStorageKey())).toContain(storedCapability);
      throw new Error('response lost after server saved');
    });
    const view = render(<EventReminder event={event} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Remind me' }), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be confirmed');
    expect(screen.queryByText(/Reminder set for/)).not.toBeInTheDocument();
    expect(localStorage.getItem(pendingReminderStorageKey())).toContain(storedCapability);
    view.unmount(); render(<EventReminder event={event} />);
    expect(screen.getByRole('combobox', { name: 'Remind me' })).toHaveValue('60');
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByText(/Reminder set for/)).toBeInTheDocument();
    expect(postMock.mock.calls[1][1]).toEqual(expect.objectContaining({ managementToken: storedCapability, remindBeforeMinutes: 60 }));
    expect(generate).toHaveBeenCalledTimes(1);
    expect(serverRecords.size).toBe(1);
    expect(localStorage.getItem(reminderStorageKey())).toContain(storedCapability);
    expect(localStorage.getItem(pendingReminderStorageKey())).not.toContain(storedCapability);
  });
  it('preserves a submitted capability when a retry cannot get notification permission', async () => {
    postMock.mockRejectedValueOnce(new Error('response lost'));
    render(<EventReminder event={event} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be confirmed');
    const capability = postMock.mock.calls[0][1].managementToken as string;
    requestMock.mockResolvedValueOnce('denied');
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Allow notifications');
    expect(localStorage.getItem(pendingReminderStorageKey())).toContain(capability);
    expect(screen.getByRole('combobox', { name: 'Remind me' })).toBeDisabled();
  });
  it('retains the durable pending capability if the acknowledged record cannot be persisted', async () => {
    const write = localStorage.setItem.bind(localStorage);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      if (key === reminderStorageKey()) throw new Error('storage became unavailable');
      write(key, value);
    });
    const view = render(<EventReminder event={event} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminder' }));
    expect(await screen.findByText(/Reminder set for/)).toBeInTheDocument();
    const capability = postMock.mock.calls[0][1].managementToken as string;
    expect(localStorage.getItem(pendingReminderStorageKey())).toContain(capability);
    expect(screen.getByText(/recovery key is retained/)).toBeInTheDocument();
    view.unmount(); render(<EventReminder event={event} />);
    expect(screen.getByRole('button', { name: 'Remove reminder' })).toBeInTheDocument();
  });
  it('keeps legacy completed capabilities usable and keeps the record after failed removal', async () => {
    localStorage.setItem(reminderStorageKey(), JSON.stringify({ [event.id]: { ...saved, eventId: event.id } }));
    render(<EventReminder event={event} />);
    expect(screen.getByRole('button', { name: 'Remove reminder' })).toBeInTheDocument();
    postMock.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove reminder' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Removal could not be confirmed'));
    expect(screen.getByText(/Reminder set for/)).toBeInTheDocument();
    expect(localStorage.getItem(reminderStorageKey())).toContain(saved.managementToken);
  });
});
