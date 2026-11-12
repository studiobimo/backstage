import {
  readSiteSettingsStamp,
  readVersionedSiteSettings,
  ROW_WRITE,
  saveSiteSettingsSchema,
  writeSiteSettings
} from '../index.ts'
import { Hono } from 'hono'

import type { AccessEnv } from './auth.ts'
import { readJsonBody, respondWithStale, versionedWrite } from './respond.ts'

export const settingsRoutes = () =>
  new Hono<AccessEnv>()
    .get('/', async (c) => c.json(await readVersionedSiteSettings(c.env.DB)))
    .put('/', async (c) => {
      const body = await readJsonBody(c, saveSiteSettingsSchema)
      if (!body.ok) return body.response
      const { expectedVersion, ...settings } = body.data
      const outcome = await writeSiteSettings(
        c.env.DB,
        settings,
        await versionedWrite(c, expectedVersion)
      )
      if (outcome === ROW_WRITE.stale) {
        return respondWithStale(c, await readSiteSettingsStamp(c.env.DB))
      }
      return c.json({ settings, version: expectedVersion + 1 })
    })
