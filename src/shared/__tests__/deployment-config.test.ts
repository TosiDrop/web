import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Cloudflare deployment configuration', () => {
  it('leaves runtime variables to the deployment instead of overriding them with placeholders', () => {
    const root = process.cwd();
    const wrangler = readFileSync(resolve(root, 'wrangler.jsonc'), 'utf8');
    const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(wrangler).not.toContain('{{VITE_VM_API_KEY}}');
    expect(packageJson.scripts.prebuild).toBeUndefined();
    expect(existsSync(resolve(root, 'build-wrangler.js'))).toBe(false);
  });
});
