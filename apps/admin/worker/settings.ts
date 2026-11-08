import {
  API_ERROR,
  readSiteSettings,
  siteSettingsSchema,
  writeSiteSettings
} from '@studiobimo/backstage'
import { Hono } from 'hono'

import { respondWithError } from './respond'

export const settingsRoutes = () =>
  new Hono<{ Bindings: Env }>()
    .get('/', async (c) => c.json({ settings: await readSiteSettings(c.env.DB!) }))
    .put('/', async (c) => {
      const parsed = siteSettingsSchema.safeParse(await c.req.json().catch(() => null))
      if (!parsed.success) return respondWithError(c, API_ERROR.invalid)
      await writeSiteSettings(c.env.DB!, parsed.data)
      return c.json({ settings: parsed.data })
    })
