import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// @ts-ignore - vitest config
export default defineConfig({
  plugins: [react()],
  // @ts-ignore - vitest test config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
