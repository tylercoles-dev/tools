import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  minify: false,
  bundle: true,
  external: [
    // Keep external dependencies as external
    'pg',
    'uuid',
    'zod',
    'qdrant-client',
    '@mcp-tools/core'
  ],
  env: {
    NODE_ENV: 'production'
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})