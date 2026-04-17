/// <reference types="@cloudflare/workers-types" />

export interface Env {
  VITE_VM_API_KEY: string;
  VM_BASE_URL?: string;
  VM_WEB_PROFILES: KVNamespace;
}
