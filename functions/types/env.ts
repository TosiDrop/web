/// <reference types="@cloudflare/workers-types" />

export interface Env {
  VITE_VM_API_KEY: string;
  VM_BASE_URL?: string;
  VM_WEB_PROFILES: KVNamespace;
  // D1 is optional so local dev (and PR previews without the binding) can boot.
  // Handlers should feature-detect before using.
  DB?: D1Database;
}
