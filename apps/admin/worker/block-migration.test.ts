import { describe, expect, it } from 'vitest'

import {
  adminRequest,
  blocksOf,
  legacyNote,
  NOTE_VERSION,
  publishPage,
  RESPONSE,
  saveBlocksAs
} from './block-migration-test-support'
import { createRegularPage, db, kv, useFreshPagesDb } from './pages-test-support'
import { snapshotOf } from './publish-test-support'
import { START } from './republish-test-support'

const storeRaw = async (pageId: string, schemaVersion: number, content: object) => {
  await saveBlocksAs(pageId, [{ id: 'n1', block: 'note', schemaVersion: 1, content: {} }])
  await db
    .prepare('UPDATE page_blocks SET schema_version = ?, content = ?')
    .bind(schemaVersion, JSON.stringify(content))
    .run()
}

describe('block schema migrations', () => {
  useFreshPagesDb()

  it('opens content saved before a schema change at the current version', async () => {
    const id = await createRegularPage()
    await saveBlocksAs(id, [legacyNote('n1', ' Hello ')])
    expect((await blocksOf(id)).blocks).toEqual([
      {
        id: 'n1',
        block: 'note',
        schemaVersion: NOTE_VERSION.current,
        content: { text: 'Hello', tags: [] }
      }
    ])
  })

  it('saves the opened content at the current version', async () => {
    const id = await createRegularPage()
    await saveBlocksAs(id, [legacyNote('n1', 'Hello')])
    const saved = await saveBlocksAs(id, (await blocksOf(id)).blocks)
    expect(saved.status).toBe(RESPONSE.ok)
    const stored = await db.prepare('SELECT schema_version, content FROM page_blocks').first()
    expect(stored).toMatchObject({ schema_version: NOTE_VERSION.current })
    expect(JSON.parse(stored!.content as string)).toEqual({ text: 'Hello', tags: [] })
  })

  it('publishes old content as the current version', async () => {
    const id = await createRegularPage()
    await saveBlocksAs(id, [legacyNote('n1', 'Hello')])
    expect((await publishPage(id)).status).toBe(RESPONSE.ok)
    expect((await snapshotOf(id, 'en')).blocks).toMatchObject([
      { schemaVersion: NOTE_VERSION.current, content: { text: 'Hello', tags: [] } }
    ])
  })

  it('republishes old content as the current version', async () => {
    const id = await createRegularPage()
    await saveBlocksAs(id, [legacyNote('n1', 'Hello')])
    await publishPage(id)
    await storeRaw(id, NOTE_VERSION.legacy, { body: 'Edited' })
    expect((await adminRequest('POST', '/republish', START)).status).toBe(RESPONSE.ok)
    expect((await snapshotOf(id, 'en')).blocks).toMatchObject([
      { schemaVersion: NOTE_VERSION.current, content: { text: 'Edited', tags: [] } }
    ])
  })

  it('refuses a publish that would not validate and names the block and the field', async () => {
    const id = await createRegularPage()
    await saveBlocksAs(id, [legacyNote('n1', ' ')])
    const response = await publishPage(id)
    expect(response.status).toBe(RESPONSE.unpublishable)
    expect(await response.json()).toMatchObject({
      code: 'unpublishable',
      problems: [{ reason: 'invalid_content', blockId: 'n1', path: 'text' }]
    })
    expect((await kv.list()).keys).toEqual([])
  })

  it('refuses content saved by a newer version of the site and still opens it', async () => {
    const id = await createRegularPage()
    await storeRaw(id, NOTE_VERSION.newer, { text: 'Hello', tags: [] })
    const response = await publishPage(id)
    expect(response.status).toBe(RESPONSE.unpublishable)
    expect(await response.json()).toMatchObject({
      problems: [{ reason: 'newer_schema_version', blockId: 'n1' }]
    })
    expect((await blocksOf(id)).blocks[0]).toMatchObject({ schemaVersion: NOTE_VERSION.newer })
  })

  it('names a block whose migration throws instead of failing the request', async () => {
    const id = await createRegularPage()
    await storeRaw(id, NOTE_VERSION.legacy, {})
    expect((await blocksOf(id)).blocks[0]).toMatchObject({ schemaVersion: NOTE_VERSION.legacy })
    const response = await publishPage(id)
    expect(response.status).toBe(RESPONSE.unpublishable)
    expect(await response.json()).toMatchObject({
      problems: [{ reason: 'migration_failed', blockId: 'n1' }]
    })
  })
})
