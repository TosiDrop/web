import type { Env } from '../types/env';
import { calendarBody, calendarFailure, calendarJson } from '../services/calendarHttp';
import { deploymentNetwork } from '../services/vmClient';
import { resolveCalendarEvent } from '../services/rewardCalendar';
import { enrollReminder, removeReminder, ReminderError, remindersAvailable } from '../services/rewardReminders';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  let available = remindersAvailable(env);
  if (available) {
    try { await env.DB!.prepare('SELECT id FROM reward_reminders LIMIT 1').first(); }
    catch { available = false; }
  }
  return calendarJson({ available, publicKey: available ? env.VAPID_PUBLIC_KEY : null });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await calendarBody(request);
    const network = deploymentNetwork(env);
    if (body.action === 'remove') {
      if (Object.keys(body).some(key => !['action','id','managementToken'].includes(key)) || typeof body.id !== 'string' || typeof body.managementToken !== 'string') throw new ReminderError('Provide the reminder id and management token');
      if (!env.DB) throw new ReminderError('Reminder storage is unavailable', 503);
      const removed = await removeReminder(env.DB, network, body.id, body.managementToken);
      if (!removed) throw new ReminderError('Reminder was not found for this browser', 404);
      return calendarJson({ removed: true });
    }
    if (!remindersAvailable(env) || !env.DB) throw new ReminderError('Browser reminders are awaiting server configuration', 503);
    const result = await enrollReminder(env.DB, network, body, id => resolveCalendarEvent(env, id), new Date(), env);
    return calendarJson(result, 201);
  } catch (error) { return calendarFailure(error); }
};
