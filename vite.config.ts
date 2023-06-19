import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  // optimizeDeps: {
  //   exclude: [
  //     'codemirror',
  //     '@codemirror/language-json',
  //     '@codemirror/language-sql' /* ... */
  //   ]
  // },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'c8',
      reporter: ['json', 'html', 'lcov']
    }
  }
});
