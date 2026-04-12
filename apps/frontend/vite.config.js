import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  esbuild: {
    jsx: 'automatic',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
  },
});
