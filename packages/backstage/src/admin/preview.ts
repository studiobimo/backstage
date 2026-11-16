import { Hono } from 'hono'

import type { Registry } from '../blocks.ts'
import { planPreview, PUBLISH_PLAN } from '../db/publishing.ts'
import { API_ERROR } from '../errors.ts'
import {
  generatePreviewToken,
  PAGE_PREVIEW,
  pagePreviewOf,
  previewKey,
  previewPathOf
} from '../page-preview.ts'

import type { AccessEnv } from './auth.ts'
import { RESPONSE_STATUS, respondUnpublishable, respondWithError } from './respond.ts'

export const previewRoutes = (registry: Registry) =>
  new Hono<AccessEnv>().post('/:id/preview', async (c) => {
    const now = Date.now()
    const plan = await planPreview(c.env.DB, registry, c.req.param('id'), now)
    if (plan.status === PUBLISH_PLAN.invalid) return respondUnpublishable(c, plan.problems)
    if (plan.status !== PUBLISH_PLAN.ready) return respondWithError(c, API_ERROR.notFound)
    const token = generatePreviewToken()
    const preview = pagePreviewOf(plan.snapshots, now)
    await c.env.SITE.put(previewKey(token), JSON.stringify(preview), {
      expirationTtl: PAGE_PREVIEW.ttlSeconds
    })
    return c.json(
      { token, path: previewPathOf(token), expiresAt: preview.expiresAt },
      RESPONSE_STATUS.created
    )
  })
