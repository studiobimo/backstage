import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'

import {
  countRepublishable,
  planPublish,
  PUBLISH_PLAN,
  readRepublishBatch,
  recordPublished,
  refreshSnapshots
} from '../db/publishing.ts'
import { ensureUser } from '../db/users.ts'
import {
  KV_LIMITS,
  kvWritesPerPage,
  kvWritesToRefresh,
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
import { refreshCollectionSnapshots, snapshotWritesOf } from './collection-snapshot.ts'
import { readJsonBody } from './respond.ts'
import {
  readSnapshots,
  bumpSiteVersion,
  rebuildPublishedIndex,
  rewriteSnapshots,
  writeSnapshots
} from './snapshots.ts'

const scopeQuerySchema = z.object({
  since: z.coerce.number().int().min(0).optional(),
  cursor: z.string().optional(),
  collection: z.string().min(1).optional(),
  entryId: z.string().min(1).optional(),
  linkedTo: z.string().min(1).optional()
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
    await recordPublished(c.env.DB, page.id, {
      editorId,
      publishedAt,
      publishedVersion: page.version,
      refs: plan.refs,
      linkedPageIds: plan.linkedPageIds
    })
    return null
  }
  return {
    pageId: page.id,
    problems: plan.status === PUBLISH_PLAN.invalid ? plan.problems : []
  }
}

type PageAction = (page: PageToRepublish) => Promise<RepublishSkipped | null>

const refreshPage = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  page: PageToRepublish
): Promise<RepublishSkipped | null> => {
  const { locales } = resolveLocaleConfig(registry)
  const published = await readSnapshots(c.env.SITE, page.id, locales)
  if (published.length === 0) return { pageId: page.id, problems: [] }
  await rewriteSnapshots(c.env.SITE, await refreshSnapshots(c.env.DB, registry, published))
  return null
}

const actionFor = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  scope: RepublishScope
): Promise<PageAction> => {
  if (scope.entry) return (page) => refreshPage(c, registry, page)
  const editorId = await ensureUser(c.env.DB, c.get('editor'))
  const publishedAt = Date.now()
  return (page) => republishPage(c, registry, page, editorId, publishedAt)
}

const republishPages = async (
  c: Context<AccessEnv>,
  pages: readonly PageToRepublish[],
  action: PageAction,
  progress: BatchProgress
) => {
  for (const page of pages) {
    try {
      const skipped = await action(page)
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

export const runRepublishBatch = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  requested: RepublishScope
): Promise<RepublishBatch> => {
  const { locales } = resolveLocaleConfig(registry)
  const since = requested.since ?? Date.now()
  const scope: RepublishScope = { ...requested, since }
  const pages = await readRepublishBatch(c.env.DB, scope, republishBatchSize(locales))
  const progress: BatchProgress = {
    republished: [],
    skipped: [],
    cursor: scope.cursor,
    halted: false
  }
  await republishPages(c, pages, await actionFor(c, registry, scope), progress)
  const { remaining } = await countRepublishable(c.env.DB, { ...scope, cursor: progress.cursor })
  const done = !progress.halted && remaining === 0
  const rebuilds = !scope.entry && done && (pages.length > 0 || scope.cursor !== null)
  if (rebuilds) await rebuildPublishedIndex(c, c.env.DB, c.env.SITE)
  const refreshesCollections = !scope.entry && !scope.linkedTo && done
  if (refreshesCollections) await refreshCollectionSnapshots(c.env.DB, c.env.SITE, registry)
  const perPage = scope.entry ? locales.length : kvWritesPerPage(locales)
  return {
    since,
    cursor: progress.cursor,
    republished: progress.republished,
    skipped: progress.skipped,
    remaining,
    writes:
      progress.republished.length * perPage +
      (rebuilds ? REPUBLISH.writes.perIndexRebuild : 0) +
      (refreshesCollections ? snapshotWritesOf(registry) : 0),
    done,
    halted: progress.halted
  }
}

export const republishRoutes = (registry: AdminRegistry) => {
  const { locales } = resolveLocaleConfig(registry)
  return new Hono<AccessEnv>()
    .get('/', async (c) => {
      const query = scopeQuerySchema.parse(c.req.query())
      const entry = query.collection
        ? { collection: query.collection, entryId: query.entryId }
        : undefined
      const scope: RepublishScope = {
        since: query.since ?? Date.now(),
        cursor: query.cursor ?? null,
        entry,
        linkedTo: query.linkedTo
      }
      const { remaining, changed } = await countRepublishable(c.env.DB, scope)
      return c.json({
        status: {
          remaining,
          changed: entry ? 0 : changed,
          writes: entry
            ? kvWritesToRefresh(remaining, locales)
            : kvWritesToRepublish(remaining, locales) + snapshotWritesOf(registry),
          dailyWriteLimit: KV_LIMITS.freePlanWritesPerDay
        }
      })
    })
    .post('/', async (c) => {
      const body = await readJsonBody(c, republishScopeSchema)
      if (!body.ok) return body.response
      const batch = await runRepublishBatch(c, registry, body.data)
      const bumps = batch.done && (batch.writes > 0 || body.data.cursor !== null)
      if (bumps) await bumpSiteVersion(c.env.SITE)
      return c.json(
        bumps ? { ...batch, writes: batch.writes + REPUBLISH.writes.perVersionBump } : batch
      )
    })
}
