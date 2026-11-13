import { API_ERROR } from '../errors.ts'
import { ensureUser } from '../db/users.ts'
import { findPage } from '../db/pages.ts'
import { planPublish, PUBLISH_PLAN, recordPublished, recordUnpublished } from '../db/publishing.ts'
import { publishPageSchema } from '../publishing.ts'
import { resolveLocaleConfig } from '../locales.ts'
import type { Registry } from '../blocks.ts'
import { Hono } from 'hono'

import type { AccessEnv } from './auth.ts'
import { respondStale } from './pages.ts'
import { readJsonBody, respondUnpublishable, respondWithError } from './respond.ts'
import { rebuildPublishedIndex, removeSnapshots, writeSnapshots } from './snapshots.ts'

export const publishRoutes = (registry: Registry) =>
  new Hono<AccessEnv>()
    .post('/:id/publish', async (c) => {
      const body = await readJsonBody(c, publishPageSchema)
      if (!body.ok) return body.response
      const id = c.req.param('id')
      const publishedAt = Date.now()
      const plan = await planPublish(c.env.DB, registry, id, body.data.expectedVersion, publishedAt)
      if (plan.status === PUBLISH_PLAN.notFound) return respondWithError(c, API_ERROR.notFound)
      if (plan.status === PUBLISH_PLAN.stale) return respondStale(c, id)
      if (plan.status === PUBLISH_PLAN.invalid) {
        return respondUnpublishable(c, plan.problems)
      }
      await writeSnapshots(c.env.SITE, plan.snapshots, resolveLocaleConfig(registry).locales)
      await recordPublished(
        c.env.DB,
        id,
        await ensureUser(c.env.DB, c.get('editor')),
        publishedAt,
        body.data.expectedVersion
      )
      await rebuildPublishedIndex(c, c.env.DB, c.env.SITE)
      return c.json({ page: await findPage(c.env.DB, id) })
    })
    .delete('/:id/publish', async (c) => {
      const id = c.req.param('id')
      if (!(await findPage(c.env.DB, id))) return respondWithError(c, API_ERROR.notFound)
      await removeSnapshots(c.env.SITE, id, resolveLocaleConfig(registry).locales)
      await recordUnpublished(c.env.DB, id)
      await rebuildPublishedIndex(c, c.env.DB, c.env.SITE)
      return c.json({ page: await findPage(c.env.DB, id) })
    })
