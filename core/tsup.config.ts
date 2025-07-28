import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/services/kanban/index.ts',
    'src/services/memory/index.ts',
    'src/services/memory-processing/index.ts',
    'src/services/wiki/index.ts',
    'src/services/scraper/index.ts',
    'src/shared/types/index.ts'
  ],
  format: ['esm'],
  target: 'node18',
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
  treeshake: true,
  dts: false, // Disable TypeScript declarations for now
  external: [
    // External dependencies should not be bundled
    'better-sqlite3',
    'pg',
    'kysely',
    'marked',
    'gray-matter',
    'slugify',
    'nats',
    'uuid',
    'zod'
  ]
});