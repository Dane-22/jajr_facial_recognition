import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'salary.spec.js', workers: 1,
  use: { baseURL: 'http://127.0.0.1:3002', headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  reporter: 'list', outputDir: 'test-results/salary',
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 3002 --strictPort', cwd: '../frontend',
    url: 'http://127.0.0.1:3002', reuseExistingServer: true, timeout: 60000 }
});
