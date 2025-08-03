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
    'better-sqlite3',
    'mysql2', 
    'pg',
    'marked',
    'zod',
    'express',
    'ws',
    '@tylercoles/mcp-server',
    '@tylercoles/mcp-transport-http'
  ],
  env: {
    NODE_ENV: 'production'
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})