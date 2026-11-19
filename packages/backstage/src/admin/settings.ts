import { fieldIssuesOf, API_ERROR } from '../errors.ts'
import {
  readRegistrySettings,
  readRegistrySettingsStamp,
  readSiteSettingsStamp,
  readVersionedSiteSettings,
  writeRegistrySettings,
  writeSiteSettings
} from '../db/settings.ts'
import { ROW_WRITE } from '../db/versioned-row.ts'
import type { AdminRegistry } from '../collections.ts'
import { saveRegistrySettingsSchema, saveSiteSettingsSchema } from '../settings.ts'
import { Hono } from 'hono'

import type { AccessEnv } from './auth.ts'
import {
  readJsonBody,
  respondInvalid,
  respondWithError,
  respondWithStale,
  versionedWrite
} from './respond.ts'

const schemaOf = (registry: AdminRegistry): Record<string, unknown> | null =>
  registry.settingsJsonSchema?.() ?? null

export const settingsRoutes = (registry: AdminRegistry) =>
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
    .get('/registry', async (c) =>
      c.json({
        schema: schemaOf(registry),
        ...(await readRegistrySettings(c.env.DB))
      })
    )
    .put('/registry', async (c) => {
      if (!registry.settings) return respondWithError(c, API_ERROR.notFound)
      const body = await readJsonBody(c, saveRegistrySettingsSchema)
      if (!body.ok) return body.response
      const valid = registry.settings.safeParse(body.data.settings)
      if (!valid.success) return respondInvalid(c, fieldIssuesOf(valid.error))
      const { expectedVersion } = body.data
      const outcome = await writeRegistrySettings(
        c.env.DB,
        valid.data as Record<string, unknown>,
        await versionedWrite(c, expectedVersion)
      )
      if (outcome === ROW_WRITE.stale) {
        return respondWithStale(c, await readRegistrySettingsStamp(c.env.DB))
      }
      return c.json({
        schema: schemaOf(registry),
        settings: valid.data,
        version: expectedVersion + 1
      })
    })
