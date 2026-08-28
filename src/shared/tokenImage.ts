// Route remote token logos through the R2-backed proxy; data URIs (and any
// other non-http values) render directly.
export function tokenImageSrc(assetId: string, logo?: string): string | undefined {
  if (!logo) return undefined;
  if (!/^https?:\/\//i.test(logo)) return logo;
  return `/api/tokenImage?id=${encodeURIComponent(assetId)}`;
}
