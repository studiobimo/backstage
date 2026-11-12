import { afterEach, describe, expect, it } from 'vitest'

import {
  createRegularPage,
  db,
  saveBlocks,
  saveSeo,
  send,
  useFreshPagesDb,
  versionOf
} from './pages-test-support'

const FAILING_WRITE = { trigger: 'fail_content_write', message: 'forced failure' } as const

const failNextWrites = (table: string, event: 'INSERT' | 'UPDATE') =>
  db
    .prepare(
      `CREATE TRIGGER ${FAILING_WRITE.trigger} BEFORE ${event} ON ${table} BEGIN SELECT RAISE(ABORT, '${FAILING_WRITE.message}'); END`
    )
    .run()

const entry = { id: 'a', block: 'split-hero', schemaVersion: 1, content: { id: 'a' } }

const emptySeo = { title: '', description: '', socialImageId: null }
const seo = { en: { ...emptySeo, title: 'New' }, es: emptySeo }

const blockIds = async (id: string) =>
  (
    (await (await send('GET', `/${id}/blocks`)).json()) as {
      blocks: { id: string }[]
    }
  ).blocks.map((block) => block.id)

describe('page writes', () => {
  useFreshPagesDb()

  describe('page saves are atomic', () => {
    afterEach(async () => {
      await db.prepare(`DROP TRIGGER IF EXISTS ${FAILING_WRITE.trigger}`).run()
    })

    it('leaves the version unchanged when the blocks write fails', async () => {
      const id = await createRegularPage()
      const before = await versionOf(id)
      await failNextWrites('page_blocks', 'INSERT')
      const response = await saveBlocks(id, [entry], before)
      expect(response.status).toBe(500)
      expect(await versionOf(id)).toBe(before)
    })

    it('keeps the previous blocks when the blocks write fails', async () => {
      const id = await createRegularPage()
      await saveBlocks(id, [entry])
      await failNextWrites('page_blocks', 'INSERT')
      await saveBlocks(id, [{ ...entry, id: 'b' }])
      expect(await blockIds(id)).toEqual(['a'])
    })

    it('leaves the version unchanged when the seo write fails', async () => {
      const id = await createRegularPage()
      const before = await versionOf(id)
      await failNextWrites('page_locales', 'UPDATE')
      const response = await saveSeo(id, seo, before)
      expect(response.status).toBe(500)
      expect(await versionOf(id)).toBe(before)
    })

    it('changes no content when the version is stale', async () => {
      const id = await createRegularPage()
      const first = await versionOf(id)
      await saveBlocks(id, [entry], first)
      const stale = await saveBlocks(id, [{ ...entry, id: 'b' }], first)
      expect(stale.status).toBe(409)
      expect(await blockIds(id)).toEqual(['a'])
    })
  })
})
