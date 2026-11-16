import type { Page } from '@playwright/test'

import { expect, test } from './fixtures'
import { siteUrl } from './ports'
import {
  addBlock,
  createPage,
  fillHeroBasics,
  newPageUnderTest,
  openBlock,
  saveDraft,
  uploadDecorativeImage,
  type PageUnderTest
} from './steps'

const PREVIEW_PATH = /\/__preview\/pages\/([\w-]+)$/
const STATUS = { ok: 200, notFound: 404 } as const
const SPLIT_HERO = 'Split Hero'
const ALTERED_TOKEN_SUFFIX = 'x'

async function openDraftInEditor(page: Page, under: PageUnderTest) {
  await uploadDecorativeImage(page)
  await createPage(page, under)
  await page.getByRole('link', { name: under.titles.en }).click()
  await addBlock(page, /Split Hero/)
  const hero = await openBlock(page, SPLIT_HERO)
  await fillHeroBasics(page, hero, under.titles.en)
  await saveDraft(page)
}

async function followPreviewTab(page: Page) {
  const popup = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Preview' }).click()
  const tab = await popup
  await tab.waitForURL(PREVIEW_PATH)
  return tab
}

const tokenOf = (url: string) => PREVIEW_PATH.exec(url)?.[1] ?? ''

test.describe('draft preview', () => {
  test('shows an unpublished draft in the site document, uncached and hidden from search', async ({
    page
  }) => {
    const under = newPageUnderTest()
    await openDraftInEditor(page, under)

    const tab = await followPreviewTab(page)
    await expect(tab.getByRole('heading', { level: 1 })).toHaveText(under.titles.en)
    await expect(tab.locator('[data-block="split-hero"]')).toHaveCSS('display', 'grid')
    const stylesheet = tab.locator('link[rel="stylesheet"]').first()
    await expect(stylesheet).toHaveAttribute('href', /.+/)
    const href = (await stylesheet.getAttribute('href')) ?? ''
    const css = await page.request.get(new URL(href, siteUrl).toString())
    expect(css.ok()).toBe(true)
    expect(css.headers()['content-type']).toContain('text/css')
    await expect(tab.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

    const response = await page.request.get(tab.url())
    expect(response.status()).toBe(STATUS.ok)
    expect(response.headers()['cache-control']).toContain('no-store')
    expect(response.headers()['x-robots-tag']).toContain('noindex')

    const live = await page.request.get(`${siteUrl}/${under.slug}`)
    expect(live.status()).toBe(STATUS.notFound)
  })

  test('answers not found for an altered or unknown token', async ({ page }) => {
    const under = newPageUnderTest()
    await openDraftInEditor(page, under)
    const tab = await followPreviewTab(page)
    const token = tokenOf(tab.url())
    expect(token).not.toBe('')

    const altered = await page.request.get(
      `${siteUrl}/__preview/pages/${token}${ALTERED_TOKEN_SUFFIX}`
    )
    expect(altered.status()).toBe(STATUS.notFound)
    const unknown = await page.request.get(`${siteUrl}/__preview/pages/${'0'.repeat(token.length)}`)
    expect(unknown.status()).toBe(STATUS.notFound)
  })
})
