/** Converts an integer amount to a Number after decimal placement, without first rounding the integer. */
export function decimalAmountToNumber(raw: string, decimals: number): number {
  if (!/^\d+$/.test(raw) || !Number.isInteger(decimals) || decimals < 0 || decimals > 38) return Number.NaN;
  const value = BigInt(raw);
  if (decimals === 0) return Number(value);
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return Number(fraction ? `${whole}.${fraction}` : whole.toString());
}
