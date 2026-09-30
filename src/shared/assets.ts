const NATIVE_UNIT = /^[a-f0-9]{56}(?:[a-f0-9]{2}){0,32}$/i;
const NATIVE_ID = /^[a-f0-9]{56}\.(?:[a-f0-9]{2}){0,32}$/i;

/** TosiDrop catalog, claim and favorite IDs separate the policy and asset name. */
export function catalogAssetId(value: string): string {
  if (NATIVE_ID.test(value)) return value.toLowerCase();
  return NATIVE_UNIT.test(value)
    ? `${value.slice(0, 56)}.${value.slice(56)}`.toLowerCase()
    : value;
}

/** Koios and market providers use the concatenated native-asset unit. */
export function nativeAssetUnit(value: string): string {
  return NATIVE_ID.test(value) ? value.replace('.', '').toLowerCase() : NATIVE_UNIT.test(value) ? value.toLowerCase() : value;
}
