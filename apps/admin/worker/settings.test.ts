import { EMPTY_SITE_SETTINGS } from '@studiobimo/backstage'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import app from './index'
import { openTestEnv } from './test-env'

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
  defaultSocialImage: { id: 'img-1', alt: '' }
}

interface SettingsBody {
  settings: typeof saved
  version: number
}

const read = async () => (await (await send('GET')).json()) as SettingsBody

const save = (settings: object, expectedVersion: number) =>
  send('PUT', { ...settings, expectedVersion })

describe('settings API', () => {
  beforeEach(async () => {
    await db.prepare('DELETE FROM site_settings').run()
  })

  it('answers empty settings at version 0 before anything is saved', async () => {
    const response = await send('GET')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ settings: EMPTY_SITE_SETTINGS, version: 0 })
  })

  it('saves the settings and reads them back at the next version', async () => {
    const put = await save(saved, 0)
    expect(put.status).toBe(200)
    expect(await put.json()).toEqual({ settings: saved, version: 1 })
    expect(await read()).toEqual({ settings: saved, version: 1 })
  })

  it('replaces the previous settings on every save', async () => {
    await save(saved, 0)
    await save({ siteName: { en: 'Bimo' } }, 1)
    expect(await read()).toEqual({ settings: { siteName: { en: 'Bimo' } }, version: 2 })
  })

  it('refuses a second save made from the same version, and says who saved first', async () => {
    await save(saved, 0)
    const winner = await save({ siteName: { en: 'First' } }, 1)
    expect(winner.status).toBe(200)
    const loser = await save({ siteName: { en: 'Second' } }, 1)
    expect(loser.status).toBe(409)
    expect(await loser.json()).toMatchObject({
      code: 'stale_version',
      current: { version: 2, updatedBy: 'Local developer' }
    })
    expect(await read()).toEqual({ settings: { siteName: { en: 'First' } }, version: 2 })
  })

  it('refuses a first save over settings that already exist', async () => {
    await save(saved, 0)
    const stale = await save({ siteName: { en: 'Late' } }, 0)
    expect(stale.status).toBe(409)
    expect((await read()).settings).toEqual(saved)
  })

  it('refuses a save with no version', async () => {
    const response = await send('PUT', saved)
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'invalid' })
  })

  it('refuses invalid settings and keeps what was saved', async () => {
    await save(saved, 0)
    const bad = await save({ ...saved, siteName: { en: '' } }, 1)
    expect(bad.status).toBe(400)
    expect(await bad.json()).toMatchObject({ code: 'invalid' })
    expect(await read()).toEqual({ settings: saved, version: 1 })
  })

  it('answers the issue and its path for a whitespace-only site name', async () => {
    const bad = await save({ siteName: { en: '   ' } }, 0)
    expect(bad.status).toBe(400)
    expect(await bad.json()).toEqual({
      error: 'Invalid input',
      code: 'invalid',
      issues: [{ path: ['siteName', 'en'], code: 'too_small', origin: 'string', minimum: 1 }]
    })
  })

  it('refuses a body that is not a settings object', async () => {
    const response = await send('PUT', 'nope')
    expect(response.status).toBe(400)
  })

  it('refuses a deployed request without Access', async () => {
    expect((await send('GET', undefined, env.deployed)).status).toBe(403)
  })
})
