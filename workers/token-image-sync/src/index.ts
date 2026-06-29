import { readResponseBodyWithLimit } from '../../../src/shared/readLimitedBody';
import { MAX_IMAGE_BYTES, syncTokenImages } from './sync';

interface Env {
  TOKEN_IMAGES: R2Bucket;
  VM_WEB_PROFILES: KVNamespace;
  VITE_VM_API_KEY: string;
  VM_BASE_URL?: string;
}

const DEFAULT_VM_BASE_URL = 'https://vmprev.adaseal.eu';

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      syncTokenImages({
        kv: env.VM_WEB_PROFILES,
        bucket: env.TOKEN_IMAGES,
        fetchTokens: async () => {
          const res = await fetch(
            `${env.VM_BASE_URL || DEFAULT_VM_BASE_URL}/api.php?action=get_tokens`,
            { headers: { 'X-API-Token': env.VITE_VM_API_KEY } },
          );
          if (!res.ok) throw new Error(`VM API ${res.status}: ${res.statusText}`);
          return res.json();
        },
        fetchImage: async (url) => {
          const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
          if (!res.ok) return null;
          const bytes = await readResponseBodyWithLimit(res, MAX_IMAGE_BYTES);
          if (!bytes) return null;
          return {
            ok: true,
            contentType: res.headers.get('Content-Type') ?? '',
            bytes,
          };
        },
      }).then((result) =>
        console.log(`image sync: scanned ${result.scanned}, stored ${result.stored}`),
      ),
    );
  },
};
