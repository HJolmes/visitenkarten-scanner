import { defineConfig } from 'vitest/config';

// Die Tests prüfen nur den Kern (src/kern), ohne React Native.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
