import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    env: {
      // Pinned so local-date assertions hold on any machine, including a UTC CI runner.
      TZ: 'Europe/Kyiv',
      VITE_API_URL: 'http://api.test/'
    }
  }
})
