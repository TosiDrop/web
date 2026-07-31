import { normalizeDeploymentNetwork } from '../../../src/shared/network';

// Pure, dependency-injected core of the nightly image-sync cron. Rotates
// through tokens alphabetically with a KV cursor so each run fetches at most
// `limit` new images (Workers subrequest limits) and the cache converges
// over successive nights.
export interface SyncDeps {
  kv: {
    get(key: string, opts: { type: 'json' }): Promise<unknown>;
    put(key: string, value: string): Promise<void>;
  };
  bucket: {
    head(key: string): Promise<unknown | null>;
    put(
      key: string,
      value: ArrayBuffer,
      opts: { httpMetadata: { contentType: string } },
    ): Promise<unknown>;
  };
  fetchTokens: () => Promise<Record<string, { logo?: string }>>;
  fetchImage: (
    url: string,
  ) => Promise<{ ok: boolean; contentType: string; bytes: ArrayBuffer } | null>;
  network?: string;
  limit?: number;
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_SCANS_PER_RUN = 500;

export async function syncTokenImages({
  kv,
  bucket,
  fetchTokens,
  fetchImage,
  network,
  limit = 40,
}: SyncDeps): Promise<{ scanned: number; stored: number }> {
  const deploymentNetwork = normalizeDeploymentNetwork(network);
  const tokensCacheKey = `__internal:tokens_cache:${deploymentNetwork}`;
  const cursorKey = `__internal:image_sync_cursor:${deploymentNetwork}`;
  const cached = (await kv.get(tokensCacheKey, { type: 'json' })) as Record<
    string,
    { logo?: string }
  > | null;
  const tokens = cached ?? (await fetchTokens());

  const ids = Object.keys(tokens ?? {})
    .filter((id) => {
      const logo = tokens[id]?.logo;
      return typeof logo === 'string' && /^https?:\/\//i.test(logo);
    })
    .sort();
  if (ids.length === 0) return { scanned: 0, stored: 0 };

  const cursor = ((await kv.get(cursorKey, { type: 'json' })) as string | null) ?? '';
  const startIdx = cursor ? ids.findIndex((id) => id > cursor) : 0;
  const rotation =
    startIdx <= 0 ? ids : [...ids.slice(startIdx), ...ids.slice(0, startIdx)];

  let scanned = 0;
  let fetched = 0;
  let stored = 0;
  let last = cursor;

  for (const id of rotation) {
    if (fetched >= limit || scanned >= MAX_SCANS_PER_RUN) break;
    scanned += 1;
    last = id;
    const objectKey = `${id}:${deploymentNetwork}`;
    try {
      if (await bucket.head(objectKey)) continue;
      fetched += 1;
      const img = await fetchImage(tokens[id]!.logo!);
      if (
        !img ||
        !img.ok ||
        !img.contentType.startsWith('image/') ||
        img.bytes.byteLength > MAX_IMAGE_BYTES
      ) {
        continue;
      }
      await bucket.put(objectKey, img.bytes, { httpMetadata: { contentType: img.contentType } });
      stored += 1;
    } catch (err) {
      console.error(`image sync failed for ${id}:`, err);
    }
  }

  await kv.put(cursorKey, JSON.stringify(last));
  return { scanned, stored };
}
