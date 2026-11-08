import { afterAll, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'

import app from './index'
import { registry } from './registry'

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

  it('keeps /api/v1/blocks behind the Access check', async () => {
    const response = await app.request('/api/v1/blocks', {}, platform.env)
    expect(response.status).toBe(403)
  })

  it('serves every registered block as JSON Schema with its field kinds', async () => {
    const response = await app.request('/api/v1/blocks', {}, localDevelopment)
    expect(response.status).toBe(200)
    const { blocks } = (await response.json()) as {
      blocks: {
        name: string
        version: number
        schema: { properties: Record<string, { backstage?: string }> }
      }[]
    }
    expect(blocks.map((block) => block.name)).toEqual([...registry.blocks.keys()])
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
