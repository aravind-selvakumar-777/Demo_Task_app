/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Exclude the Playwright e2e folder so Vitest doesn't try to run it
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
});
