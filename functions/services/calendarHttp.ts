import { readResponseBodyWithLimit } from '../../src/shared/readLimitedBody';
import { ReminderError } from './rewardReminders';

export function calendarJson(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function calendarBody(request: Request): Promise<Record<string, unknown>> {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) throw new ReminderError('Use this site to submit the request', 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new ReminderError('Request body must be JSON', 415);
  const data = await readResponseBodyWithLimit(new Response(request.body, {headers:request.headers}), 24_576);
  if (!data) throw new ReminderError('Request body is too large', 413);
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(data)) as unknown; } catch { throw new ReminderError('Invalid JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ReminderError('Request must be a JSON object');
  return body as Record<string, unknown>;
}
export function calendarFailure(error: unknown): Response {
  return error instanceof ReminderError ? calendarJson({ error: error.message }, error.status) : calendarJson({ error: 'Calendar storage or source is unavailable. Try again shortly.' }, 503);
}
