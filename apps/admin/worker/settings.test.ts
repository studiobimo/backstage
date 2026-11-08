import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { EMPTY_SITE_SETTINGS } from '@studiobimo/backstage'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import app from './index'
import { openTestEnv } from './test-env'

const migration = readFileSync(
  resolve(import.meta.dirname, '../../../packages/backstage/migrations/0001_site_settings.sql'),
  'utf8'
)

const { dispose, db, env } = await openTestEnv()
afterAll(dispose)

const send = (method: string, body?: unknown, bindings = env.localDevelopment) =>
  app.request(
    '/api/v1/settings',
    {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    },
    bindings
  )

const saved = {
  ...EMPTY_SITE_SETTINGS,
  siteName: { en: 'Studio', es: 'Estudio' },
  navigation: [{ en: { href: '/about', label: 'About' } }]
}

describe('settings API', () => {
  beforeAll(async () => {
    await db.prepare('DROP TABLE IF EXISTS site_settings').run()
    await db.prepare(migration.trim()).run()
  })

  it('answers empty settings before anything is saved', async () => {
    const response = await send('GET')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ settings: EMPTY_SITE_SETTINGS })
  })

  it('saves the settings and reads them back', async () => {
    const put = await send('PUT', saved)
    expect(put.status).toBe(200)
    expect(await (await send('GET')).json()).toEqual({ settings: saved })
  })

  it('replaces the previous settings on every save', async () => {
    await send('PUT', saved)
    await send('PUT', { ...saved, navigation: [] })
    const { settings } = (await (await send('GET')).json()) as { settings: typeof saved }
    expect(settings.navigation).toEqual([])
  })

  it('refuses invalid settings and keeps what was saved', async () => {
    await send('PUT', saved)
    const bad = await send('PUT', { ...saved, navigation: [{ en: { href: 'x', label: '' } }] })
    expect(bad.status).toBe(400)
    expect(await bad.json()).toMatchObject({ code: 'invalid' })
    expect(await (await send('GET')).json()).toEqual({ settings: saved })
  })

  it('refuses a body that is not JSON', async () => {
    const response = await app.request(
      '/api/v1/settings',
      { method: 'PUT', body: 'nope' },
      env.localDevelopment
    )
    expect(response.status).toBe(400)
  })

  it('refuses a deployed request without Access', async () => {
    expect((await send('GET', undefined, env.deployed)).status).toBe(403)
  })
})
