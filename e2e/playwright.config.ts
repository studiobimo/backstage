import { defineConfig, devices } from '@playwright/test'

import { adminUrl, E2E, siteUrl } from './ports'

const wranglerDev = (app: string, worker: string, port: number, extra = '') =>
  `pnpm exec wrangler dev --config apps/${app}/dist/${worker}/wrangler.json --port ${port} ` +
  `--inspector-port ${port + 100} --persist-to ${E2E.stateDir} ${extra}`

const migrate =
  `pnpm exec wrangler d1 migrations apply DB --local --config apps/admin/wrangler.jsonc ` +
  `--persist-to ${E2E.stateDir}`

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: adminUrl, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `${migrate} && ${wranglerDev('admin', 'backstage_admin', E2E.admin.port, '--var DEV_AUTH:true')}`,
      url: adminUrl,
      reuseExistingServer: !process.env.CI,
      cwd: '..',
      timeout: 120_000
    },
    {
      command: wranglerDev('site', 'backstage_site', E2E.site.port),
      url: `${siteUrl}/robots.txt`,
      reuseExistingServer: !process.env.CI,
      cwd: '..',
      timeout: 120_000
    }
  ]
})
