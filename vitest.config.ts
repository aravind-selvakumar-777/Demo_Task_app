import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Scope Vitest to the real unit/integration tests under src/. Without
    // this, Vitest's default include glob (**/*.{test,spec}.*) also matches
    // the Playwright e2e specs under e2e/*.spec.ts, which import test/expect
    // from the Playwright fixtures and are incompatible with Vitest's runner.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
