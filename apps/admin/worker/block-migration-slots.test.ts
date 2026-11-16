import { ensureUser, writeSiteBlock } from '@studiobimo/backstage/admin'
import { describe, expect, it } from 'vitest'

import { adminRequest, NOTE_VERSION, RESPONSE } from './block-migration-test-support'
import { db, useFreshPagesDb } from './pages-test-support'
import { publishedSite, saveName } from './site-publish-test-support'

describe('slot block schema migrations', () => {
  useFreshPagesDb()

  const storeBanner = async (schemaVersion: number, content: object) => {
    await saveName({ en: 'Studio' })
    await writeSiteBlock(
      db,
      'header',
      { block: 'banner', schemaVersion, content: content as never },
      { expectedVersion: 0, editorId: await ensureUser(db, { email: 'e@example.com', name: '' }) }
    )
  }

  const publishSiteWithMigrations = () => adminRequest('POST', '/site/publish')

  it('opens a slot saved before a schema change at the current version', async () => {
    await storeBanner(NOTE_VERSION.legacy, { body: 'Hi' })
    const { slots } = (await (await adminRequest('GET', '/slots')).json()) as {
      slots: { name: string; current: unknown }[]
    }
    expect(slots.find(({ name }) => name === 'header')?.current).toEqual({
      block: 'banner',
      schemaVersion: NOTE_VERSION.current,
      content: { text: 'Hi' }
    })
  })

  it('publishes the migrated slot', async () => {
    await storeBanner(NOTE_VERSION.legacy, { body: 'Hi' })
    expect((await publishSiteWithMigrations()).status).toBe(RESPONSE.ok)
    expect((await publishedSite('en'))?.slots.header).toMatchObject({
      schemaVersion: NOTE_VERSION.current,
      content: { text: 'Hi' }
    })
  })

  it('refuses a slot that would not validate and names the field', async () => {
    await storeBanner(NOTE_VERSION.current, { text: '' })
    const response = await publishSiteWithMigrations()
    expect(response.status).toBe(RESPONSE.unpublishable)
    expect(await response.json()).toMatchObject({
      problems: [{ reason: 'invalid_content', slot: 'header', path: 'text' }]
    })
  })

  it('refuses a slot from a newer version, and one whose migration throws', async () => {
    await storeBanner(NOTE_VERSION.newer, { text: 'Hi' })
    expect(await (await publishSiteWithMigrations()).json()).toMatchObject({
      problems: [{ reason: 'newer_schema_version', slot: 'header' }]
    })
    await db.prepare('UPDATE site_blocks SET schema_version = 1, content = ?').bind('null').run()
    expect(await (await publishSiteWithMigrations()).json()).toMatchObject({
      problems: [{ reason: 'migration_failed', slot: 'header' }]
    })
  })
})
