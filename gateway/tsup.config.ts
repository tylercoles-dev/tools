import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
  treeshake: true,
  external: [
    // Mark all node_modules as external
  ],
  noExternal: [
    // Include specific packages in bundle if needed
  ],
  env: {
    NODE_ENV: 'production'
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});