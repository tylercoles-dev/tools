import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/migrate.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  minify: false,
  sourcemap: true,
  splitting: false,
  bundle: true,
  external: ['better-sqlite3', 'pg', 'mysql2'],
  esbuildOptions: (options) => {
    options.platform = 'node';
  }
});