import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'

import {
  countRepublishable,
  planPublish,
  PUBLISH_PLAN,
  readRepublishBatch,
  recordPublished
} from '../db/publishing.ts'
import { ensureUser } from '../db/users.ts'
import {
  KV_LIMITS,
  kvWritesPerPage,
  kvWritesToRepublish,
  REPUBLISH,
  republishBatchSize,
  republishScopeSchema,
  type RepublishBatch,
  type RepublishScope,
  type RepublishSkipped
} from '../republish.ts'
import { logEvent } from '../observability.ts'
import { resolveLocaleConfig } from '../locales.ts'
import type { AdminRegistry } from '../collections.ts'
import type { AccessEnv } from './auth.ts'
import { readJsonBody } from './respond.ts'
import { rebuildPublishedIndex, writeSnapshots } from './snapshots.ts'

const scopeQuerySchema = z.object({
  since: z.coerce.number().int().min(0).optional(),
  cursor: z.string().optional()
})

const REPUBLISH_LOG = { halted: 'republish halted' } as const

interface BatchProgress {
  republished: string[]
  skipped: RepublishSkipped[]
  cursor: string | null
  halted: boolean
}

interface PageToRepublish {
  id: string
  version: number
}

const republishPage = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  page: PageToRepublish,
  editorId: string,
  publishedAt: number
): Promise<RepublishSkipped | null> => {
  const plan = await planPublish(c.env.DB, registry, page.id, page.version, publishedAt)
  if (plan.status === PUBLISH_PLAN.ready) {
    await writeSnapshots(c.env.SITE, plan.snapshots, resolveLocaleConfig(registry).locales)
    await recordPublished(c.env.DB, page.id, editorId, publishedAt, page.version, plan.refs)
    return null
  }
  return {
    pageId: page.id,
    problems: plan.status === PUBLISH_PLAN.invalid ? plan.problems : []
  }
}

const republishPages = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  pages: readonly PageToRepublish[],
  progress: BatchProgress
) => {
  const editorId = await ensureUser(c.env.DB, c.get('editor'))
  const publishedAt = Date.now()
  for (const page of pages) {
    try {
      const skipped = await republishPage(c, registry, page, editorId, publishedAt)
      if (skipped) progress.skipped.push(skipped)
      else progress.republished.push(page.id)
      progress.cursor = page.id
    } catch (error) {
      logEvent('error', c, REPUBLISH_LOG.halted, {
        pageId: page.id,
        error: error instanceof Error ? error.message : String(error)
      })
      progress.halted = true
      return
    }
  }
}

export const republishRoutes = (registry: AdminRegistry) => {
  const { locales } = resolveLocaleConfig(registry)
  return new Hono<AccessEnv>()
    .get('/', async (c) => {
      const query = scopeQuerySchema.parse(c.req.query())
      const scope: RepublishScope = {
        since: query.since ?? Date.now(),
        cursor: query.cursor ?? null
      }
      const { remaining, changed } = await countRepublishable(c.env.DB, scope)
      return c.json({
        status: {
          remaining,
          changed,
          writes: kvWritesToRepublish(remaining, locales),
          dailyWriteLimit: KV_LIMITS.freePlanWritesPerDay
        }
      })
    })
    .post('/', async (c) => {
      const body = await readJsonBody(c, republishScopeSchema)
      if (!body.ok) return body.response
      const since = body.data.since ?? Date.now()
      const pages = await readRepublishBatch(
        c.env.DB,
        { since, cursor: body.data.cursor },
        republishBatchSize(locales)
      )
      const progress: BatchProgress = {
        republished: [],
        skipped: [],
        cursor: body.data.cursor,
        halted: false
      }
      await republishPages(c, registry, pages, progress)
      const { remaining } = await countRepublishable(c.env.DB, { since, cursor: progress.cursor })
      const done = !progress.halted && remaining === 0
      const rebuilds = done && (pages.length > 0 || body.data.cursor !== null)
      if (rebuilds) await rebuildPublishedIndex(c, c.env.DB, c.env.SITE)
      const response: RepublishBatch = {
        since,
        cursor: progress.cursor,
        republished: progress.republished,
        skipped: progress.skipped,
        remaining,
        writes:
          progress.republished.length * kvWritesPerPage(locales) +
          (rebuilds ? REPUBLISH.writes.perIndexRebuild : 0),
        done,
        halted: progress.halted
      }
      return c.json(response)
    })
}
