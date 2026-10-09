import { defineConfig } from 'vitest/config';

// Unit tests run in jsdom so DOMPurify and the DOM post-processing can be exercised
// without a browser. The tests make no network requests.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
