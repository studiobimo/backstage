import { afterAll, describe, expect, it } from 'vitest'

import app from './index'
import { openTestEnv } from './test-env'

const { dispose, env } = await openTestEnv()
afterAll(dispose)

const SAME_ORIGIN = 'http://localhost'
const EVIL_ORIGIN = 'https://evil.example'
const SETTINGS_URL = `${SAME_ORIGIN}/api/v1/settings`
const PAGES_URL = `${SAME_ORIGIN}/api/v1/pages`
const MEDIA_URL = `${SAME_ORIGIN}/api/v1/media`

const write = (headers: Record<string, string>, method = 'PUT', body = '{}') =>
  app.request(SETTINGS_URL, { method, headers, body }, env.localDevelopment)

const upload = (origin: string) =>
  app.request(
    MEDIA_URL,
    { method: 'POST', headers: { origin }, body: new FormData() },
    env.localDevelopment
  )

describe('cross-site writes', () => {
  it.each(['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x'])(
    'refuses a %s write from another origin',
    async (type) => {
      const response = await write({ 'content-type': type, origin: EVIL_ORIGIN })
      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({ error: 'Forbidden', code: 'forbidden' })
    }
  )

  it('refuses a write with no content type from another origin', async () => {
    expect((await write({ origin: EVIL_ORIGIN })).status).toBe(403)
  })

  it('refuses a media upload from another origin', async () => {
    expect((await upload(EVIL_ORIGIN)).status).toBe(403)
  })

  it('lets a JSON write from the same origin through', async () => {
    const response = await write({ 'content-type': 'application/json', origin: SAME_ORIGIN })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'invalid' })
  })

  it('lets the media upload through from the same origin', async () => {
    const response = await upload(SAME_ORIGIN)
    expect(response.status).not.toBe(403)
    expect(response.status).not.toBe(415)
  })
})

describe('JSON routes', () => {
  it.each([
    ['POST', PAGES_URL],
    ['PUT', SETTINGS_URL]
  ])('answer 415 to a %s whose body is not JSON', async (method, url) => {
    const response = await app.request(
      url,
      { method, headers: { 'content-type': 'text/plain', origin: SAME_ORIGIN }, body: '{}' },
      env.localDevelopment
    )
    expect(response.status).toBe(415)
    expect(await response.json()).toMatchObject({ code: 'unsupported_content_type' })
  })

  it('answer 415 to a same-origin write with no content type', async () => {
    expect((await write({ origin: SAME_ORIGIN })).status).toBe(415)
  })

  it('ignore parameters on the JSON content type', async () => {
    const response = await write({ 'content-type': 'Application/JSON; charset=utf-8' })
    expect(response.status).toBe(400)
  })

  it('answer 400 to a JSON body that does not parse', async () => {
    const response = await write({ 'content-type': 'application/json' }, 'PUT', 'nope')
    expect(response.status).toBe(400)
  })
})
