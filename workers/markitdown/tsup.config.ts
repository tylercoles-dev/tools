import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false, // Disable TypeScript declarations to avoid path resolution issues  
  sourcemap: true,
  clean: true,
  target: 'node18',
  outDir: 'dist',
  splitting: false,
  external: [
    // External dependencies that should not be bundled
    'nats',
    'winston', 
    'dotenv'
  ],
  esbuildOptions(options) {
    // Ensure proper module resolution for path mappings
    options.resolveExtensions = ['.ts', '.js', '.json'];
  },
});