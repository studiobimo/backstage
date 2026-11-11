import {
  API_ERROR,
  ensureUser,
  errorBody,
  findPage,
  planPublish,
  PUBLISH_PLAN,
  publishPageSchema,
  recordPublished,
  recordUnpublished,
  type Registry
} from '../index.ts'
import { Hono } from 'hono'

import type { AccessEnv } from './auth.ts'
import { respondStale } from './pages.ts'
import { respondWithError } from './respond.ts'
import { indexPublished, indexUnpublished, removeSnapshots, writeSnapshots } from './snapshots.ts'

export const publishRoutes = (registry: Registry) =>
  new Hono<AccessEnv>()
    .post('/:id/publish', async (c) => {
      const parsed = publishPageSchema.safeParse(await c.req.json().catch(() => null))
      if (!parsed.success) return respondWithError(c, API_ERROR.invalid)
      const id = c.req.param('id')
      const publishedAt = Date.now()
      const plan = await planPublish(
        c.env.DB!,
        registry,
        id,
        parsed.data.expectedVersion,
        publishedAt
      )
      if (plan.status === PUBLISH_PLAN.notFound) return respondWithError(c, API_ERROR.notFound)
      if (plan.status === PUBLISH_PLAN.stale) return respondStale(c, id)
      if (plan.status === PUBLISH_PLAN.invalid) {
        return c.json(
          { ...errorBody(API_ERROR.unpublishable), problems: plan.problems },
          API_ERROR.unpublishable.status
        )
      }
      await writeSnapshots(c.env.SITE!, plan.snapshots)
      await recordPublished(
        c.env.DB!,
        id,
        await ensureUser(c.env.DB!, c.get('editor')),
        publishedAt
      )
      await indexPublished(c.env.SITE!, plan.snapshots)
      return c.json({ page: await findPage(c.env.DB!, id) })
    })
    .delete('/:id/publish', async (c) => {
      const id = c.req.param('id')
      if (!(await findPage(c.env.DB!, id))) return respondWithError(c, API_ERROR.notFound)
      await removeSnapshots(c.env.SITE!, id)
      await recordUnpublished(c.env.DB!, id)
      await indexUnpublished(c.env.SITE!, id)
      return c.json({ page: await findPage(c.env.DB!, id) })
    })
