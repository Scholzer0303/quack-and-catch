import { defineConfig } from 'vitest/config';

// Unit-Tests (M9). jsdom liefert window/localStorage für die SaveSystem-Tests;
// die reinen Economy-Tests laufen darin ebenso. Nur *.test.ts unter src/.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
