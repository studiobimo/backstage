import { afterAll, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'

import app from './index'

const platform = await getPlatformProxy<Env>()
afterAll(() => platform.dispose())

const localDevelopment = { ...platform.env, DEV_AUTH: 'true' }

describe('worker', () => {
  it('answers /api/health', async () => {
    const response = await app.request('/api/health', {}, localDevelopment)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('answers an unknown /api path with a JSON 404', async () => {
    const response = await app.request('/api/nothing-here', {}, localDevelopment)
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found', code: 'not_found' })
  })
})
