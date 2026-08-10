import { defineConfig, devices } from '@playwright/test'

/**
 * The behaviour gate, beside the parity gate.
 *
 * `tools/parity` proves the port *looks* and *reads* like the prototype: the same anchors, the same
 * tree, on every screen a state can reach. It says nothing about what a click does — and every defect
 * found on the day these were written was a control that existed and did nothing. That is this file's
 * job: the flows that carry an order across the four boards, asserted on state rather than on pixels.
 *
 * Port 5175 rather than the 5173 Vite defaults to: another project on this machine holds that one, and
 * a suite that fights for a port fails for the wrong reason.
 */
const PORT = 5175
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `bunx vite dev --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})
