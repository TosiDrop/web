import { registrySubject } from './tokenRegistry';

// Route remote token logos through the R2-backed proxy; data URIs (and any
// other non-http values) render directly. Tokens with no logo still ask the
// proxy, which can find one in the Cardano Token Registry.
export function tokenImageSrc(assetId: string, logo?: string): string | undefined {
  if (logo && !/^https?:\/\//i.test(logo)) return logo;
  if (!logo && !registrySubject(assetId)) return undefined;
  return `/api/tokenImage?id=${encodeURIComponent(assetId)}`;
}
