import { afterAll, describe, expect, it } from 'vitest'

import app from './index'
import { openTestEnv } from './test-env'

const { dispose, env } = await openTestEnv()
afterAll(dispose)

const SAME_ORIGIN = 'http://localhost'
const SETTINGS_URL = 'http://localhost/api/v1/settings'
const EVIL_ORIGIN = 'https://evil.example'

const write = (headers: Record<string, string>, method = 'PUT') =>
  app.request(SETTINGS_URL, { method, headers, body: '{}' }, env.localDevelopment)

describe('cross-site writes', () => {
  it.each(['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x'])(
    'rejects a %s write from another origin',
    async (type) => {
      const response = await write({ 'content-type': type, origin: EVIL_ORIGIN }, 'POST')
      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({ error: 'Forbidden', code: 'forbidden' })
    }
  )

  it('accepts a write from the same origin', async () => {
    const response = await write({ 'content-type': 'application/json', origin: SAME_ORIGIN })
    expect(response.status).not.toBe(403)
    expect(response.status).not.toBe(415)
  })
})

describe('write content type', () => {
  it.each(['POST', 'PUT', 'PATCH'])('answers 415 to a %s that is not JSON', async (method) => {
    const response = await write({ 'content-type': 'text/plain', origin: SAME_ORIGIN }, method)
    expect(response.status).toBe(415)
    expect((await response.json()) as { code: string }).toMatchObject({
      code: 'unsupported_content_type'
    })
  })

  it('answers 415 to a write with no content type', async () => {
    expect((await write({ origin: SAME_ORIGIN })).status).toBe(415)
  })

  it('lets a JSON write with a charset through', async () => {
    const response = await write({ 'content-type': 'application/json; charset=utf-8' })
    expect(response.status).not.toBe(415)
  })

  it('lets the media upload send multipart', async () => {
    const response = await app.request(
      'http://localhost/api/v1/media',
      { method: 'POST', headers: { origin: SAME_ORIGIN }, body: new FormData() },
      env.localDevelopment
    )
    expect(response.status).not.toBe(415)
  })
})
