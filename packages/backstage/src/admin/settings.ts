import { readSiteSettings, siteSettingsSchema, writeSiteSettings } from '../index.ts'
import { Hono } from 'hono'

import { readJsonBody } from './respond.ts'
import type { AdminEnv } from './env.ts'

export const settingsRoutes = () =>
  new Hono<{ Bindings: AdminEnv }>()
    .get('/', async (c) => c.json({ settings: await readSiteSettings(c.env.DB) }))
    .put('/', async (c) => {
      const body = await readJsonBody(c, siteSettingsSchema)
      if (!body.ok) return body.response
      await writeSiteSettings(c.env.DB, body.data)
      return c.json({ settings: body.data })
    })
