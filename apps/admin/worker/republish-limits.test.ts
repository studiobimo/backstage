import { KV_LIMITS, kvWritesToRepublish, resolveLocaleConfig } from '@studiobimo/backstage'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { regular, send, sendApi, useFreshPagesDb } from './pages-test-support'
import {
  createPage,
  publishedPages,
  runBatch,
  runToEnd,
  START,
  statusOf,
  resetRepublishRun,
  countKvWrites,
  REPUBLISH_TEST_TIMING
} from './republish-test-support'

describe('republish limits', { timeout: REPUBLISH_TEST_TIMING.suiteTimeoutMs }, () => {
  useFreshPagesDb()
  afterEach(resetRepublishRun)

  it('shows the writes it will use, and they match the writes it makes', async () => {
    await publishedPages(['a', 'b', 'c', 'd', 'e'])
    const status = await statusOf()
    expect(status).toMatchObject({
      remaining: 5,
      writes: kvWritesToRepublish(5, resolveLocaleConfig().locales),
      dailyWriteLimit: KV_LIMITS.freePlanWritesPerDay
    })
    const writes = countKvWrites()
    const batches = await runToEnd()
    expect(writes).toHaveLength(status.writes)
    expect(batches.reduce((total, { writes }) => total + writes, 0)).toBe(status.writes)
  })

  it('counts pages with unpublished changes among those it will publish', async () => {
    const id = (await publishedPages(['a']))[0]!
    await publishedPages(['b'])
    await send('PUT', `/${id}`, { ...regular('a'), expectedVersion: 1 })
    expect((await statusOf()).changed).toBe(1)
  })

  it('reports no writes when nothing is published', async () => {
    await createPage('a')
    expect(await statusOf()).toMatchObject({ remaining: 0, writes: 0 })
    const writes = countKvWrites()
    expect(await runBatch(START)).toMatchObject({ done: true, republished: [], writes: 0 })
    expect(writes).toEqual([])
  })

  it('halts when KV refuses a write and resumes from the failed page', async () => {
    const ids = await publishedPages(['a', 'b', 'c'])
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    countKvWrites(true)
    const halted = await runBatch(START)
    expect(halted).toMatchObject({ halted: true, done: false, republished: [], writes: 0 })
    const batches = await runToEnd([halted])
    expect(batches.flatMap(({ republished }) => republished).sort()).toEqual(ids)
  })

  it('rejects a body that is not a scope', async () => {
    expect((await sendApi('/republish', 'POST', { since: 'now' })).status).toBe(400)
  })
})
