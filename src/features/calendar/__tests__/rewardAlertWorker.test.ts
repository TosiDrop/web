import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function worker() {
  const listeners = new Map<string, (event: unknown) => void>();
  const showNotification = vi.fn(async () => {});
  const navigate = vi.fn(async () => {});
  const focus = vi.fn(async () => {});
  const self = {
    location: { origin: 'https://tosidrop.me' }, registration: { showNotification },
    clients: { matchAll: async () => [{ url: 'https://tosidrop.me/profile', navigate, focus }], openWindow: vi.fn(), claim: async () => {} },
    skipWaiting: async () => {}, addEventListener: (name: string, fn: (event: unknown) => void) => listeners.set(name, fn),
  };
  runInNewContext(readFileSync('public/reward-alert-sw.js', 'utf8'), { self, URL });
  const trigger = async (name: string, extra: Record<string, unknown>) => {
    let work: Promise<unknown> | undefined;
    listeners.get(name)?.({ ...extra, waitUntil: (promise: Promise<unknown>) => { work = promise; } });
    await work;
  };
  return { showNotification, navigate, focus, trigger };
}

describe('reward notification worker', () => {
  it('shows a push reminder with a safe application destination', async () => {
    const runtime = worker();
    await runtime.trigger('push', { data: { json: () => ({ title: 'TOSI rewards', body: 'Starts soon', url: '/calendar?event=a', tag: 'event-a' }) } });
    expect(runtime.showNotification).toHaveBeenCalledWith('TOSI rewards', expect.objectContaining({ body: 'Starts soon', data: { url: 'https://tosidrop.me/calendar?event=a' } }));
  });
  it('replaces external destinations and malformed payloads with a safe reminder', async () => {
    const runtime = worker();
    await runtime.trigger('push', { data: { json: () => ({ title: 'Date', url: 'https://evil.example' }) } });
    expect(runtime.showNotification).toHaveBeenLastCalledWith('Date', expect.objectContaining({ data: { url: 'https://tosidrop.me/calendar' } }));
    await runtime.trigger('push', { data: { json: () => { throw new Error('Malformed'); } } });
    expect(runtime.showNotification).toHaveBeenLastCalledWith('Reward reminder', expect.objectContaining({ data: { url: 'https://tosidrop.me/calendar' } }));
  });
  it('opens reminder details in an existing app window and preserves legacy reward navigation', async () => {
    const runtime = worker();
    await runtime.trigger('notificationclick', { notification: { close: vi.fn(), data: { url: 'https://tosidrop.me/calendar?event=a' } } });
    expect(runtime.navigate).toHaveBeenLastCalledWith('https://tosidrop.me/calendar?event=a');
    expect(runtime.focus).toHaveBeenCalledOnce();
    await runtime.trigger('notificationclick', { notification: { close: vi.fn() } });
    expect(runtime.navigate).toHaveBeenLastCalledWith('https://tosidrop.me/claim');
  });
});
