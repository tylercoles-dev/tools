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
    'marked',  
    'zod',
    'express',
    'ws',
    '@tylercoles/mcp-server',
    '@tylercoles/mcp-transport-http',
    'kysely',
    '@mcp-tools/core'
  ],
  esbuildOptions: (options) => {
    // Ensure @mcp-tools/core is resolved from TypeScript paths
    options.bundle = true;
    options.platform = 'node';
  },
  env: {
    NODE_ENV: 'production'
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})