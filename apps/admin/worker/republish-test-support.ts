import {
  republishBatchSchema,
  republishStatusResponseSchema,
  type RepublishBatch,
  type RepublishScope
} from '@studiobimo/backstage'
import { vi } from 'vitest'

import { db, kv, regular, send, sendApi } from './pages-test-support'
import { publish } from './publish-test-support'

export const START: RepublishScope = { since: null, cursor: null }

export const createPage = async (slug: string) =>
  ((await (await send('POST', '', regular(slug))).json()) as { page: { id: string } }).page.id

export const publishedPages = async (slugs: string[]) => {
  const ids: string[] = []
  for (const slug of slugs) {
    const id = await createPage(slug)
    await publish(id)
    ids.push(id)
  }
  return ids.sort()
}

const countingKv = (rejectFirst = false) => {
  const writes: string[] = []
  let rejected = !rejectFirst
  const site = new Proxy(kv, {
    get: (target, property) => {
      if (property === 'put') {
        return (key: string, ...rest: [string]) => {
          if (!rejected) {
            rejected = true
            return Promise.reject(new Error('KV PUT failed with 429 Too Many Requests'))
          }
          writes.push(key)
          return target.put(key, ...rest)
        }
      }
      const member = Reflect.get(target, property)
      return typeof member === 'function' ? member.bind(target) : member
    }
  })
  return { site, writes }
}

const suite: { bindings: Partial<Env> } = { bindings: {} }

export const runBatch = async (scope: RepublishScope) =>
  republishBatchSchema.parse(
    await (await sendApi('/republish', 'POST', scope, suite.bindings)).json()
  )

export const runToEnd = async (from: RepublishBatch[] = []) => {
  const batches = [...from]
  const last = from.at(-1)
  let scope: RepublishScope = last ? { since: last.since, cursor: last.cursor } : START
  while (batches.at(-1)?.done !== true) {
    const batch = await runBatch(scope)
    batches.push(batch)
    scope = { since: batch.since, cursor: batch.cursor }
  }
  return batches
}

export const statusOf = async (query = '') =>
  republishStatusResponseSchema.parse(await (await sendApi(`/republish${query}`)).json()).status

export const breakLayout = (id: string) =>
  db.prepare("UPDATE pages SET layout = 'gone' WHERE id = ?").bind(id).run()

export const countKvWrites = (rejectFirst = false) => {
  const counting = countingKv(rejectFirst)
  suite.bindings = { SITE: counting.site }
  return counting.writes
}

export const resetRepublishRun = () => {
  suite.bindings = {}
  vi.restoreAllMocks()
}

export const REPUBLISH_TEST_TIMING = { suiteTimeoutMs: 30_000 } as const
