import { SEO } from '@studiobimo/backstage/site'
import { afterEach, describe, expect, it } from 'vitest'

import { regular, send, useFreshPagesDb } from './pages-test-support'
import { publishedIndex, publishedPage } from './publish-test-support'
import {
  breakLayout,
  publishedPages,
  runBatch,
  runToEnd,
  START,
  resetRepublishRun,
  countKvWrites,
  REPUBLISH_TEST_TIMING
} from './republish-test-support'

describe(
  'republish every published page',
  { timeout: REPUBLISH_TEST_TIMING.suiteTimeoutMs },
  () => {
    useFreshPagesDb()
    afterEach(resetRepublishRun)

    it('republishes in batches, then rebuilds the index once', async () => {
      const ids = await publishedPages(['a', 'b', 'c', 'd', 'e'])
      const writes = countKvWrites()
      const batches = await runToEnd()
      expect(batches.length).toBeGreaterThan(1)
      expect(batches.flatMap(({ republished }) => republished).sort()).toEqual(ids)
      expect(batches.map(({ done }) => done)).toEqual([...batches.slice(1).map(() => false), true])
      expect(writes.filter((key) => key === SEO.indexKey)).toHaveLength(1)
      expect((await publishedIndex()).pages.map(({ pageId }) => pageId).sort()).toEqual(ids)
    })

    it('records the saved version it republished', async () => {
      const [id] = await publishedPages(['a'])
      await send('PUT', `/${id}`, {
        ...regular('a'),
        titles: { en: 'Renamed', es: 'Renombrada' },
        expectedVersion: 1
      })
      expect((await publishedPage(id!)).publishedVersion).toBe(1)
      await runToEnd()
      expect((await publishedPage(id!)).publishedVersion).toBe(2)
    })

    it('reports a page it cannot validate, skips it and carries on', async () => {
      const [good, broken, other] = await publishedPages(['a', 'b', 'c'])
      await breakLayout(broken!)
      const batches = await runToEnd()
      expect(batches.flatMap(({ republished }) => republished).sort()).toEqual([good, other].sort())
      const skipped = batches.flatMap((batch) => batch.skipped)
      expect(skipped).toEqual([
        { pageId: broken, problems: [{ reason: 'unknown_layout', blockId: null }] }
      ])
      expect(batches.at(-1)?.done).toBe(true)
    })

    it('resumes from the cursor without republishing what is done', async () => {
      await publishedPages(['a', 'b', 'c', 'd', 'e'])
      const first = await runBatch(START)
      expect(first.done).toBe(false)
      const writes = countKvWrites()
      const resumed = await runBatch({ since: first.since, cursor: first.cursor })
      const first2 = new Set(first.republished)
      expect(resumed.republished.some((id) => first2.has(id))).toBe(false)
      expect(writes).toHaveLength(resumed.writes)
    })
  }
)
