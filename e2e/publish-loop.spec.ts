import type { Page } from '@playwright/test'

import { expectNoAxeViolations } from './axe'
import { expect, test } from './fixtures'
import { siteUrl } from './ports'
import {
  addBlock,
  blockRow,
  chooseFromLibrary,
  createPage,
  editorLocaleTab,
  fillHeroBasics,
  IMAGE_FILE,
  newPageUnderTest,
  openBlock,
  publishPage,
  saveDraft,
  unpublishPage,
  uploadDecorativeImage,
  type PageUnderTest
} from './steps'

const BODY_TEXT = 'Typed into the rich text body'
const DESCRIPTION = 'A page made by the end to end test'
const SPLIT_HERO = 'Split Hero'
const TEXT_BLOCK = 'One-Column Text'
const MEDIA_PATH = /\/media\/([0-9a-z-]+)\.png$/i

async function openNewPageEditor(page: Page, under: PageUnderTest) {
  await uploadDecorativeImage(page)
  await createPage(page, under)
  await page.getByRole('link', { name: under.titles.en }).click()
}

async function fillHeroThroughTheForm(page: Page, under: PageUnderTest) {
  await addBlock(page, /Split Hero/)
  await openBlock(page, SPLIT_HERO)
  const hero = page.locator('li[data-block-id]').first()
  await fillHeroBasics(page, hero, under.titles.en)
  await hero.getByRole('textbox', { name: 'Body' }).click()
  await page.keyboard.type(BODY_TEXT)
  await editorLocaleTab(page, 'Spanish').click()
  await hero.getByRole('textbox', { name: 'Title' }).fill(under.titles.es)
  await expect(hero.getByRole('textbox', { name: 'Title' })).toHaveValue(under.titles.es)
  await editorLocaleTab(page, 'English').click()
  await expect(hero.getByRole('textbox', { name: 'Title' })).toHaveValue(under.titles.en)
  await expect(hero.getByRole('textbox', { name: 'Body' })).toContainText(BODY_TEXT)
  await expect(hero.locator('.ProseMirror')).toHaveCSS('white-space', 'pre-wrap')
  await saveDraft(page)
}

async function reorderWithTheKeyboard(page: Page) {
  await addBlock(page, /One-Column Text/)
  await saveDraft(page)
  const handle = page.getByRole('button', { name: `Reorder ${SPLIT_HERO}` })
  await handle.focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Space')
  await expect(page.locator('li[data-block-id]').first()).toContainText(TEXT_BLOCK)
  await saveDraft(page)
  await page.reload()
  await expect(page.locator('li[data-block-id]').first()).toContainText(TEXT_BLOCK)
  await page.getByRole('button', { name: `Remove ${TEXT_BLOCK}` }).click()
  await saveDraft(page)
  await expect(blockRow(page, SPLIT_HERO)).toBeVisible()
}

async function setSocialImageAndDescription(page: Page) {
  await page.getByLabel('Description', { exact: true }).fill(DESCRIPTION)
  await chooseFromLibrary(page, 'Social image', IMAGE_FILE)
  await saveDraft(page)
}

async function scanTheEditor(page: Page) {
  await openBlock(page, SPLIT_HERO)
  await expectNoAxeViolations(page, 'the open block form')
  await page.getByRole('button', { name: 'Add block' }).click()
  await expect(page.getByRole('option', { name: /Split Hero/ })).toBeVisible()
  await expectNoAxeViolations(page, 'the block picker')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('option', { name: /Split Hero/ })).toBeHidden()
}

async function expectSiteRenders(page: Page, under: PageUnderTest) {
  await page.goto(`${siteUrl}/${under.slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(under.titles.en)
  await expect(page.getByText(BODY_TEXT)).toBeVisible()
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', DESCRIPTION)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', MEDIA_PATH)
  const picture = page.locator('img').first()
  await expect(picture).toHaveAttribute('src', MEDIA_PATH)
  await expect
    .poll(() => picture.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0)
  await expect(page.locator('[data-block="split-hero"]')).toHaveCSS('display', 'grid')

  await page.goto(`${siteUrl}/es/${under.slug}-es`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(under.titles.es)
}

test('create, fill the block form, reorder, publish and see it on the site', async ({ page }) => {
  const under = newPageUnderTest()
  await openNewPageEditor(page, under)
  await fillHeroThroughTheForm(page, under)
  await reorderWithTheKeyboard(page)
  await setSocialImageAndDescription(page)
  await scanTheEditor(page)
  await publishPage(page)
  await expectSiteRenders(page, under)
})

test('unpublishing a page makes the site answer not found', async ({ page }) => {
  const under = newPageUnderTest()
  await openNewPageEditor(page, under)
  await addBlock(page, /Split Hero/)
  const hero = await openBlock(page, SPLIT_HERO)
  await fillHeroBasics(page, hero, under.titles.en)
  await saveDraft(page)
  await publishPage(page)
  const sitemap = await page.request.get(`${siteUrl}/sitemap.xml`)
  expect(await sitemap.text()).toContain(`/${under.slug}<`)

  await unpublishPage(page, under.titles.en)

  const gone = await page.request.get(`${siteUrl}/${under.slug}`)
  expect(gone.status()).toBe(404)
  expect(await gone.text()).not.toContain(under.titles.en)
})
