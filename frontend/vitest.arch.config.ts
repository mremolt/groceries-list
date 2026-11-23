import { defineConfig } from 'vitest/config';

// Architecture tests run in plain Node, outside the Angular unit-test builder (TS-ARCH-13).
export default defineConfig({
  test: { include: ['test/**/*.spec.ts'], environment: 'node', testTimeout: 60_000 },
});
