import { defineConfig, devices } from '@playwright/test'
import { API_URL } from './e2e/api.ts'

const PORT = 4173
const CI = Boolean(process.env.CI)

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'node_modules/.tmp/playwright',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `vite build && vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    timeout: 120_000,
    env: { VITE_API_URL: API_URL }
  }
})
