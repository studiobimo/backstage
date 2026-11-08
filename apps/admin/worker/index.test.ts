import { afterAll, describe, expect, it } from 'vitest'

import app from './index'
import { openTestEnv } from './test-env'

const { dispose, env } = await openTestEnv()
afterAll(dispose)

describe('worker', () => {
  it('answers /api/health', async () => {
    const response = await app.request('/api/health', {}, env.localDevelopment)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('answers /api/health before the Access check', async () => {
    const response = await app.request('/api/health', {}, env.deployed)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('answers an unknown /api path with a JSON 404', async () => {
    const response = await app.request('/api/nothing-here', {}, env.localDevelopment)
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found', code: 'not_found' })
  })

  it('keeps /api/v1/blocks behind the Access check', async () => {
    const response = await app.request('/api/v1/blocks', {}, env.deployed)
    expect(response.status).toBe(403)
  })

  it('serves every page block as JSON Schema with its field kinds', async () => {
    const response = await app.request('/api/v1/blocks', {}, env.localDevelopment)
    expect(response.status).toBe(200)
    const { blocks } = (await response.json()) as {
      blocks: {
        name: string
        version: number
        schema: { properties: Record<string, { backstage?: string }> }
      }[]
    }
    expect(blocks.map((block) => block.name)).toEqual(['hero'])
    const hero = blocks.find((block) => block.name === 'hero')
    expect(hero?.version).toBe(1)
    expect(
      Object.fromEntries(
        Object.entries(hero?.schema.properties ?? {}).map(([field, schema]) => [
          field,
          schema.backstage
        ])
      )
    ).toEqual({
      title: 'localized',
      body: 'localized',
      cta: 'link',
      picture: 'image',
      theme: undefined
    })
  })
})
