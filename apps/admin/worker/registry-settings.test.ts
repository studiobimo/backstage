import { defineRegistry, localized } from '@studiobimo/backstage'
import { createAdmin } from '@studiobimo/backstage/admin'
import { findRegistrySettings } from '@studiobimo/backstage/site'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { db, kv, sendTo, useFreshPagesDb } from './pages-test-support'
import { saveName } from './site-publish-test-support'

const MINUTES = { min: 5, max: 240 } as const

const reservationsRegistry = defineRegistry([], {
  settings: z.object({
    reservations: z.object({
      slotMinutes: z.number().int().min(MINUTES.min).max(MINUTES.max),
      closedOn: z.array(z.enum(['monday', 'sunday']))
    }),
    note: localized(z.string().trim().max(80)).optional()
  })
})
const reservations = createAdmin(reservationsRegistry)
const plain = createAdmin(defineRegistry([]))

const settings = {
  reservations: { slotMinutes: 30, closedOn: ['sunday'] },
  note: { en: 'Call for groups', es: 'Llama para grupos' }
}

const sendSettings = (method: string, body?: unknown) =>
  sendTo(reservations, method, '/settings/registry', body)

const versionNow = async () =>
  (await db
    .prepare("SELECT version FROM site_settings WHERE id = 'registry'")
    .first<number>('version')) ?? 0

const save = async (value: unknown) =>
  sendSettings('PUT', { settings: value, expectedVersion: await versionNow() })

const publish = () => sendTo(reservations, 'POST', '/site/publish')

const publicationOfReservations = async () =>
  (
    (await (await sendTo(reservations, 'GET', '/site/publication')).json()) as {
      publication: { hasUnpublishedChanges: boolean }
    }
  ).publication

describe('registry settings', () => {
  useFreshPagesDb()

  it('describes the declared schema with nothing saved yet', async () => {
    const body = (await (await sendSettings('GET')).json()) as {
      schema: { properties: Record<string, unknown> }
      settings: object
      version: number
    }
    expect(Object.keys(body.schema.properties)).toEqual(['reservations', 'note'])
    expect(body).toMatchObject({ settings: {}, version: 0 })
  })

  it('saves valid values and reads them back', async () => {
    expect((await save(settings)).status).toBe(200)
    expect(await (await sendSettings('GET')).json()).toMatchObject({ settings, version: 1 })
  })

  it('refuses values the schema rejects, naming the field', async () => {
    const response = await save({ ...settings, reservations: { slotMinutes: 1, closedOn: [] } })
    expect(response.status).toBe(400)
    expect(JSON.stringify(await response.json())).toContain('slotMinutes')
    expect(await versionNow()).toBe(0)
  })

  it('refuses a save made from a stale version', async () => {
    await save(settings)
    const response = await sendSettings('PUT', { settings, expectedVersion: 0 })
    expect(response.status).toBe(409)
  })

  it('has nothing to describe or save when the registry declares no settings', async () => {
    expect(await (await sendTo(plain, 'GET', '/settings/registry')).json()).toMatchObject({
      schema: null
    })
    const refused = await sendTo(plain, 'PUT', '/settings/registry', {
      settings: {},
      expectedVersion: 0
    })
    expect(refused.status).toBe(404)
  })

  it('puts the values in the snapshot of each locale and reads them typed', async () => {
    await saveName({ en: 'Studio' })
    await save(settings)
    expect((await publish()).status).toBe(200)
    for (const locale of ['en', 'es'] as const) {
      expect(await findRegistrySettings(kv, reservationsRegistry, locale)).toEqual(settings)
    }
  })

  it('leaves the reader empty when nothing was saved', async () => {
    await saveName({ en: 'Studio' })
    await publish()
    expect(await findRegistrySettings(kv, reservationsRegistry, 'en')).toBeNull()
  })

  it('flags the site as changed after the settings are saved', async () => {
    await saveName({ en: 'Studio' })
    await publish()
    expect((await publicationOfReservations()).hasUnpublishedChanges).toBe(false)
    await save(settings)
    expect((await publicationOfReservations()).hasUnpublishedChanges).toBe(true)
  })

  it('refuses to publish stored values that no longer fit the schema', async () => {
    await saveName({ en: 'Studio' })
    await db
      .prepare(
        "INSERT INTO site_settings (id, content, version, updated_at) VALUES ('registry', ?, 1, 0)"
      )
      .bind(JSON.stringify({ reservations: {} }))
      .run()
    const response = await publish()
    expect(response.status).toBe(422)
    expect(JSON.stringify(await response.json())).toContain('_settings')
  })
})
