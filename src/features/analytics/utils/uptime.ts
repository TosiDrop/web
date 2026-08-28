/** "376 days, 19 hours, 12 minutes, 28 seconds" → "376d 19h" */
export function shortUptime(raw: string): string {
  const m = /(\d+) days?(?:, (\d+) hours?)?/.exec(raw);
  if (!m) return raw;
  return m[2] ? `${m[1]}d ${m[2]}h` : `${m[1]}d`;
}
