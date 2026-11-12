import { expectNoAxeViolations } from './axe'
import { test } from './fixtures'

for (const path of ['/pages', '/settings', '/media']) {
  test(`axe finds no violations on ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await expectNoAxeViolations(page, path)
  })
}
