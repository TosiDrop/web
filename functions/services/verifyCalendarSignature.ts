import verifySignature from '@cardano-foundation/cardano-verify-datasignature';
import { buildCalendarAnnouncementMessage, calendarInstant, type CalendarAnnouncementSigningInput } from '../../src/shared/calendar';
import type { VerifyResult } from './verifyProjectSignature';

export async function verifyCalendarSignature(input: Omit<CalendarAnnouncementSigningInput, 'signedAt'> & {
  message: unknown; signature: unknown; key: unknown; now: Date; signedAt?: string;
}): Promise<VerifyResult> {
  const fail = (reason: string): VerifyResult => ({ ok: false, status: 401, reason });
  if (typeof input.message !== 'string' || typeof input.signature !== 'string' || typeof input.key !== 'string' || input.signature.length > 8192 || input.key.length > 4096) return fail('Missing or invalid wallet signature');
  let signedAt: unknown;
  try {
    if (!input.message.startsWith('TosiDrop calendar announcement v1\n')) return fail('Malformed signing message');
    signedAt = (JSON.parse(input.message.slice('TosiDrop calendar announcement v1\n'.length)) as Record<string, unknown>).signedAt;
  } catch { return fail('Malformed signing message'); }
  const time = calendarInstant(signedAt);
  if (time === null || Math.abs(input.now.getTime() - time) > 300_000) return fail('Signing message is stale; sign again within five minutes');
  const expected = await buildCalendarAnnouncementMessage({ ...input, signedAt: signedAt as string });
  if (expected !== input.message) return fail('Signed domain, network, owner, project, event or announcement does not match this request');
  try {
    if (verifySignature(input.signature, input.key, input.message, input.ownerAddress)) return { ok: true };
  } catch { /* Never log signature material. */ }
  return fail('Wallet signature verification failed');
}
