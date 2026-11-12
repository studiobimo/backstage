import { ensureUser, siteSnapshotKey, writeSiteBlock } from '@studiobimo/backstage'
import { describe, expect, it } from 'vitest'

import { db, kv, useFreshPagesDb } from './pages-test-support'
import { publicationOf, publishSite, saveName, saveSettings } from './site-publish-test-support'

const unsaved = async () => ({
  expectedVersion: 0,
  editorId: await ensureUser(db, { email: 'editor@example.com', name: '' })
})

const problemsOfPublishing = async () =>
  ((await (await publishSite()).json()) as { problems: Record<string, unknown>[] }).problems

describe('refusing to publish the site', () => {
  useFreshPagesDb()

  it('names the slot whose saved content no longer fits its block, and writes nothing', async () => {
    await saveName({ en: 'Studio' })
    await writeSiteBlock(
      db,
      'header',
      { block: 'site-header', schemaVersion: 1, content: {} },
      await unsaved()
    )
    const response = await publishSite()
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      code: 'unpublishable',
      problems: [{ reason: 'invalid_content', slot: 'header' }]
    })
    expect(await kv.get(siteSnapshotKey('en'))).toBeNull()
    expect((await publicationOf()).publishedAt).toBeNull()
  })

  it('names a slot that holds a block the slot does not offer', async () => {
    await saveName({ en: 'Studio' })
    await writeSiteBlock(
      db,
      'header',
      { block: 'site-footer', schemaVersion: 1, content: {} },
      await unsaved()
    )
    expect(await problemsOfPublishing()).toEqual([
      { reason: 'unknown_block', blockId: null, slot: 'header' }
    ])
  })

  it('names a site with no name in the default language', async () => {
    await saveName({ es: 'Estudio' })
    expect(await problemsOfPublishing()).toEqual([
      { reason: 'missing_default_locale', blockId: null, path: 'siteName' }
    ])
  })

  it('names a default social image that left the media library', async () => {
    await saveSettings({
      siteName: { en: 'Studio' },
      defaultSocialImage: { id: 'gone', alt: '' }
    })
    expect(await problemsOfPublishing()).toEqual([{ reason: 'unknown_media', blockId: null }])
  })
})
