import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { solidPng } from './png'
import { siteUrl } from './ports'

const IMAGE_SIZE_PX = 64
const IMAGE_COLOR = [200, 60, 90] as const

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const run = Date.now().toString(36)
const PAGE_UNDER_TEST = {
  slug: `e2e-${run}`,
  titles: { en: `E2E page ${run}`, es: `Página E2E ${run}` }
}

async function uploadDecorativeImage(page: Page) {
  await page.goto('/media')
  await page.getByLabel('Image', { exact: true }).setInputFiles({
    name: 'pixel.png',
    mimeType: 'image/png',
    buffer: solidPng(IMAGE_SIZE_PX, IMAGE_COLOR)
  })
  await page.getByRole('switch', { name: /Decorative image/ }).click()
  await page.getByRole('button', { name: 'Upload image' }).click()
  await expect(page.getByText('Image uploaded')).toBeVisible()
}

async function createPage(page: Page) {
  await page.goto('/pages')
  await page.getByRole('button', { name: 'New page' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.locator('[name="titles.en"]').fill(PAGE_UNDER_TEST.titles.en)
  await sheet.locator('[name="slugs.en"]').fill(PAGE_UNDER_TEST.slug)
  await sheet.getByRole('tab', { name: /Español/ }).click()
  await sheet.locator('[name="titles.es"]').fill(PAGE_UNDER_TEST.titles.es)
  await sheet.locator('[name="slugs.es"]').fill(`${PAGE_UNDER_TEST.slug}-es`)
  await sheet.getByRole('button', { name: 'Create page' }).click()
  await expect(page.getByText(PAGE_UNDER_TEST.titles.en)).toBeVisible()
}

const idOfLatestUpload = async (page: Page) => {
  const response = await page.request.get('/api/v1/media')
  const { media } = (await response.json()) as { media: { id: string }[] }
  return media[0]!.id
}

const pageIdOf = (page: Page) => new URL(page.url()).pathname.split('/').at(-1)!

const heroContent = (pictureId: string) => ({
  title: { en: PAGE_UNDER_TEST.titles.en, es: PAGE_UNDER_TEST.titles.es },
  body: {},
  cta: { href: '/contact', label: 'Contact' },
  picture: { id: pictureId, alt: '' },
  theme: 'light'
})

async function addHeroBlock(page: Page) {
  await page.getByRole('button', { name: 'Add block' }).click()
  await page.getByRole('menuitem', { name: 'hero' }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Unsaved changes')).toBeHidden()
}

async function fillHeroContentThroughTheApi(page: Page, pictureId: string) {
  const pageId = pageIdOf(page)
  const current = await page.request.get(`/api/v1/pages/${pageId}/blocks`)
  const { blocks, version } = (await current.json()) as {
    blocks: { id: string; block: string; schemaVersion: number }[]
    version: number
  }
  const saved = await page.request.put(`/api/v1/pages/${pageId}/blocks`, {
    data: {
      expectedVersion: version,
      blocks: blocks.map((block) => ({ ...block, content: heroContent(pictureId) }))
    }
  })
  expect(saved.ok()).toBe(true)
  await page.reload()
}

async function setSocialImageAndDescription(page: Page) {
  await page.getByLabel('Description', { exact: true }).fill('A page made by the end to end test')
  await page.getByRole('button', { name: 'Choose Social image' }).click()
  await page.getByRole('dialog').getByRole('radio', { name: 'pixel.png' }).first().click()
  await expect(page.getByRole('button', { name: 'Change Social image' })).toBeVisible()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Unsaved changes')).toBeHidden()
}

test('create, fill, upload, publish and see it on the site', async ({ page }) => {
  await uploadDecorativeImage(page)
  const pictureId = await idOfLatestUpload(page)
  await createPage(page)
  await page.getByRole('link', { name: PAGE_UNDER_TEST.titles.en }).click()
  await addHeroBlock(page)
  await fillHeroContentThroughTheApi(page, pictureId)
  await setSocialImageAndDescription(page)

  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(violations).toEqual([])

  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await expect(page.getByText('Published', { exact: true }).first()).toBeVisible()

  await page.goto(`${siteUrl}/${PAGE_UNDER_TEST.slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(PAGE_UNDER_TEST.titles.en)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'A page made by the end to end test'
  )
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    new RegExp(`/media/${pictureId}\\.png$`)
  )
  await expect(page.locator('img').first()).toHaveAttribute('src', new RegExp(pictureId))

  await page.goto(`${siteUrl}/es/${PAGE_UNDER_TEST.slug}-es`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(PAGE_UNDER_TEST.titles.es)
})
