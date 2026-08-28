import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  define: {
    'process.version': JSON.stringify(''),
    'process.browser': true,
  },
  plugins: [
    wasm(),
    nodePolyfills({
      include: ['crypto', 'stream', 'buffer', 'util', 'process', 'events', 'string_decoder'],
      globals: { Buffer: true, process: true },
      protocolImports: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        // Shim a global `exports` object so CJS polyfills
        // (e.g. randomfill inside crypto-browserify) that write
        // `exports.foo = ...` don't throw ReferenceError at runtime.
        banner: 'globalThis.exports=globalThis.exports||{};',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      }
    }
  }
})
