import type { Page } from '@playwright/test'

import { expect, test } from './fixtures'
import { newPageUnderTest, publishPage, saveDraft } from './steps'

const COLLECTION_PATH = '/collections/posts'
const NEW_ENTRY_URL = /\/collections\/posts\/new$/
const ENTRY_URL = /\/collections\/posts\/(?!new$)[\w-]+$/

const TITLE_MAX_LENGTH = 120
const REFUSED_WRITE_LOG = /status of 400/

const titleField = (page: Page) => page.getByLabel('Title', { exact: true })

const rowAction = (page: Page, name: string) =>
  page
    .getByRole('menuitem', { name, exact: true })
    .or(page.getByRole('dialog').getByRole('button', { name, exact: true }))

async function startNewEntry(page: Page) {
  await page.goto(COLLECTION_PATH)
  await page.getByRole('link', { name: 'New entry' }).click()
  await expect(page).toHaveURL(NEW_ENTRY_URL)
}

test.describe('collection entries', () => {
  test('shows a validation error on its field and refuses to save', async ({
    page,
    browserErrors
  }) => {
    await startNewEntry(page)
    await titleField(page).fill('a'.repeat(TITLE_MAX_LENGTH + 1))
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText(`Use ${TITLE_MAX_LENGTH} characters or fewer.`)).toBeVisible()
    await expect(titleField(page)).toHaveAttribute('data-invalid', '')
    await expect(page).toHaveURL(NEW_ENTRY_URL)
    browserErrors.splice(
      0,
      browserErrors.length,
      ...browserErrors.filter((message) => !REFUSED_WRITE_LOG.test(message))
    )
  })

  test('creates, edits, publishes and deletes an entry', async ({ page }) => {
    const { titles } = newPageUnderTest()
    const edited = `${titles.en} edited`
    await startNewEntry(page)
    await titleField(page).fill(titles.en)
    await saveDraft(page)
    await expect(page).toHaveURL(ENTRY_URL)

    await titleField(page).fill(edited)
    await saveDraft(page)
    await publishPage(page)

    await page.goto(COLLECTION_PATH)
    const row = page.getByRole('row').filter({ hasText: edited })
    await expect(row.getByText('Published', { exact: true })).toBeVisible()

    await row.getByRole('button', { name: `Actions for ${edited}` }).click()
    await rowAction(page, 'Delete').click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete entry' }).click()
    await expect(page.getByRole('row').filter({ hasText: edited })).toHaveCount(0)
  })
})
