/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/convertisseur-images/',
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
