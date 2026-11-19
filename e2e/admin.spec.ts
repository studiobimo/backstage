import { expectNoAxeViolations, settled } from './axe'
import { expect, test } from './fixtures'

for (const path of ['/pages', '/settings', '/media']) {
  test(`axe finds no violations on ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await expectNoAxeViolations(page, path)
  })
}

test('axe finds no violations in the new page sheet', async ({ page }) => {
  await page.goto('/pages')
  await page.getByRole('button', { name: 'New page' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await settled(page.getByRole('dialog'))
  await expectNoAxeViolations(page, 'the new page sheet')
})
