import { readResponseBodyWithLimit } from '../../../src/shared/readLimitedBody';
import { vmConfig, vmGet } from '../../../functions/services/vmClient';
import { MAX_IMAGE_BYTES, syncTokenImages } from './sync';

interface Env {
  TOKEN_IMAGES: R2Bucket;
  VM_WEB_PROFILES: KVNamespace;
  VITE_NETWORK?: string;
  VITE_VM_API_KEY: string;
  VM_BASE_URL?: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!vmConfig(env)) {
      console.error('image sync: invalid VM deployment configuration');
      return;
    }

    ctx.waitUntil(
      syncTokenImages({
        kv: env.VM_WEB_PROFILES,
        bucket: env.TOKEN_IMAGES,
        network: env.VITE_NETWORK,
        fetchTokens: async () =>
          vmGet(env, 'get_tokens') as Promise<Record<string, { logo?: string }>>,
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
