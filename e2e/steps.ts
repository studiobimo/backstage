import type { Locator, Page } from '@playwright/test'

import { expect } from './fixtures'
import { solidPng } from './png'

const IMAGE_SIZE_PX = 64
const IMAGE_COLOR = [200, 60, 90] as const
const BASE_36 = 36
const RANDOM_SUFFIX_LENGTH = 4

export const IMAGE_FILE = 'pixel.png'

export function newPageUnderTest() {
  const run = `${Date.now().toString(BASE_36)}${Math.random()
    .toString(BASE_36)
    .slice(2, 2 + RANDOM_SUFFIX_LENGTH)}`
  return {
    slug: `e2e-${run}`,
    titles: { en: `E2E page ${run}`, es: `Página E2E ${run}` }
  }
}

export type PageUnderTest = ReturnType<typeof newPageUnderTest>

export async function uploadDecorativeImage(page: Page) {
  await page.goto('/media')
  await page.getByLabel('Image', { exact: true }).setInputFiles({
    name: IMAGE_FILE,
    mimeType: 'image/png',
    buffer: solidPng(IMAGE_SIZE_PX, IMAGE_COLOR)
  })
  await page.getByRole('switch', { name: /Decorative image/ }).click()
  await page.getByRole('button', { name: 'Upload image' }).click()
  await expect(page.getByText('Image uploaded')).toBeVisible()
}

export async function createPage(page: Page, under: PageUnderTest) {
  await page.goto('/pages')
  await page.getByRole('button', { name: 'New page' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.locator('[name="titles.en"]').fill(under.titles.en)
  await sheet.locator('[name="slugs.en"]').fill(under.slug)
  await sheet.getByRole('tab', { name: /Español/ }).click()
  await sheet.locator('[name="titles.es"]').fill(under.titles.es)
  await sheet.locator('[name="slugs.es"]').fill(`${under.slug}-es`)
  await sheet.getByRole('button', { name: 'Create page' }).click()
  await expect(page.getByText(under.titles.en)).toBeVisible()
}

export async function saveDraft(page: Page) {
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Unsaved changes')).toBeHidden()
}

export async function addBlock(page: Page, name: RegExp) {
  await page.getByRole('button', { name: 'Add block' }).click()
  await page.getByRole('option', { name }).click()
  await expect(page.getByRole('button', { name: /^Reorder / }).last()).toBeVisible()
}

export const editorLocaleTab = (page: Page, language: string) =>
  page.getByRole('tablist', { name: 'Editing language' }).getByRole('tab', { name: language })

export const blockRow = (page: Page, name: string) =>
  page.locator('li[data-block-id]').filter({ has: page.getByLabel(`Edit ${name}`) })

export async function openBlock(page: Page, name: string) {
  const row = blockRow(page, name)
  const trigger = row.getByRole('button', { name: `Edit ${name}` })
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  return row
}

export async function chooseFromLibrary(page: Page, label: string, filename: string) {
  await page.getByRole('button', { name: `Choose ${label}` }).click()
  await page.getByRole('dialog').getByRole('radio', { name: filename }).first().click()
  await expect(page.getByRole('button', { name: `Change ${label}` })).toBeVisible()
}

export async function publishPage(page: Page) {
  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await expect(page.getByText(/Live since/)).toBeVisible()
}

export async function unpublishPage(page: Page, title: string) {
  await page.getByRole('button', { name: 'More publishing options' }).click()
  await page.getByRole('menuitem', { name: 'Unpublish' }).click()
  const dialog = page.getByRole('alertdialog', { name: `Unpublish ${title}?` })
  await dialog.getByRole('button', { name: 'Unpublish' }).click()
  await expect(page.getByText('Not live. Visitors cannot see this page yet.')).toBeVisible()
}

export async function fillHeroBasics(page: Page, row: Locator, title: string) {
  await row.getByRole('textbox', { name: 'Title' }).fill(title)
  const cta = row.getByRole('group', { name: /^Cta/ })
  await cta.getByRole('textbox', { name: 'Address' }).fill('/contact')
  await cta.getByRole('textbox', { name: 'Label' }).fill('Contact')
  await chooseFromLibrary(page, 'Picture', IMAGE_FILE)
}
