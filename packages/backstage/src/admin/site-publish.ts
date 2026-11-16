import { ensureUser } from '../db/users.ts'
import {
  planSitePublish,
  readSitePublication,
  recordSitePublished,
  SITE_PUBLISH_PLAN
} from '../db/site-publishing.ts'
import type { Registry } from '../blocks.ts'
import { Hono } from 'hono'

import type { AccessEnv } from './auth.ts'
import { respondUnpublishable } from './respond.ts'
import { writeSiteSnapshots } from './snapshots.ts'

export const sitePublishRoutes = (registry: Registry) =>
  new Hono<AccessEnv>()
    .get('/publication', async (c) => c.json({ publication: await readSitePublication(c.env.DB) }))
    .post('/publish', async (c) => {
      const publishedAt = Date.now()
      const plan = await planSitePublish(c.env.DB, registry, publishedAt)
      if (plan.status === SITE_PUBLISH_PLAN.invalid) {
        return respondUnpublishable(c, plan.problems)
      }
      await writeSiteSnapshots(c.env.SITE, plan.snapshots)
      const editorId = await ensureUser(c.env.DB, c.get('editor'))
      await recordSitePublished(c.env.DB, editorId, publishedAt, plan.versions, plan.linkedPageIds)
      return c.json({ publication: await readSitePublication(c.env.DB) })
    })
