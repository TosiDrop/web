import path from 'path';
import { defineConfig } from 'vitest/config';

// Date formatting in components pins 'en-US'; pin the zone too so assertions
// on rendered dates hold on every machine.
process.env.TZ = 'UTC';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'functions/**/*.test.ts', 'workers/**/*.test.ts'],
    server: {
      deps: {
        inline: ['@meshsdk/core', '@meshsdk/react'],
      },
    },
  },
});
