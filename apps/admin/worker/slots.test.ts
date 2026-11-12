import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import app from './index'
import { openTestEnv } from './test-env'

const { dispose, db, env } = await openTestEnv()
afterAll(dispose)

const send = (method: string, path: string, body?: unknown) =>
  app.request(
    `/api/v1${path}`,
    {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    },
    env.localDevelopment
  )

const headerBlock = {
  block: 'site-header',
  schemaVersion: 1,
  content: {
    navigation: [{ link: { en: { href: '/about', label: 'About' } }, dropdown: [] }]
  }
}

const header = { ...headerBlock, expectedVersion: 0 }

interface SlotBody {
  slot: { name: string; version: number; current: unknown }
}
interface SlotsBody {
  slots: { name: string; version: number; blocks: { name: string }[]; current: unknown }[]
}

describe('slots API', () => {
  beforeEach(async () => {
    await db.prepare('DELETE FROM site_blocks').run()
  })

  it('lists each slot with its block variants and nothing saved yet', async () => {
    const { slots } = (await (await send('GET', '/slots')).json()) as SlotsBody
    expect(slots.map(({ name }) => name)).toEqual(['header', 'footer'])
    expect(slots[0]?.blocks.map(({ name }) => name)).toEqual(['site-header'])
    expect(slots[0]?.current).toBeNull()
  })

  it('saves a slot and reads it back', async () => {
    const put = await send('PUT', '/slots/header', header)
    expect(put.status).toBe(200)
    expect(((await put.json()) as SlotBody).slot.current).toMatchObject({ block: 'site-header' })
    const { slots } = (await (await send('GET', '/slots')).json()) as SlotsBody
    expect(slots.find(({ name }) => name === 'header')?.current).toMatchObject(headerBlock)
    expect(slots.find(({ name }) => name === 'footer')?.current).toBeNull()
  })
})

describe('slots API versions', () => {
  beforeEach(async () => {
    await db.prepare('DELETE FROM site_blocks').run()
  })

  it('versions each slot on its own', async () => {
    expect(
      ((await (await send('PUT', '/slots/header', header)).json()) as SlotBody).slot.version
    ).toBe(1)
    const next = await send('PUT', '/slots/header', { ...header, expectedVersion: 1 })
    expect(((await next.json()) as SlotBody).slot.version).toBe(2)
    const { slots } = (await (await send('GET', '/slots')).json()) as SlotsBody
    expect(slots.map(({ name, version }) => [name, version])).toEqual([
      ['header', 2],
      ['footer', 0]
    ])
  })

  it('refuses a second save made from the same version, and says who saved first', async () => {
    await send('PUT', '/slots/header', header)
    const winner = { ...headerBlock, expectedVersion: 1 }
    expect((await send('PUT', '/slots/header', winner)).status).toBe(200)
    const loser = await send('PUT', '/slots/header', { ...headerBlock, expectedVersion: 1 })
    expect(loser.status).toBe(409)
    expect(await loser.json()).toMatchObject({
      code: 'stale_version',
      current: { version: 2, updatedBy: 'Local developer' }
    })
    const { slots } = (await (await send('GET', '/slots')).json()) as SlotsBody
    expect(slots[0]?.version).toBe(2)
  })

  it('refuses a first save over a slot that already has content', async () => {
    await send('PUT', '/slots/header', header)
    expect((await send('PUT', '/slots/header', header)).status).toBe(409)
  })
})

describe('slots API validation', () => {
  beforeEach(async () => {
    await db.prepare('DELETE FROM site_blocks').run()
  })

  it('refuses content that does not match the block schema, and keeps what was saved', async () => {
    await send('PUT', '/slots/header', header)
    const bad = { ...header, content: { navigation: [{ link: { en: { href: 'x', label: '' } } }] } }
    const response = await send('PUT', '/slots/header', bad)
    expect(response.status).toBe(400)
    const { slots } = (await (await send('GET', '/slots')).json()) as SlotsBody
    expect(slots[0]?.current).toMatchObject(headerBlock)
  })

  it('answers the issues, with their paths, for content the block schema refuses', async () => {
    const blank = { link: { en: { href: '/about', label: '   ' } }, dropdown: [] }
    const response = await send('PUT', '/slots/header', {
      ...header,
      content: { navigation: [blank] }
    })
    expect(response.status).toBe(400)
    const body = (await response.json()) as { code: string; issues: { path: unknown[] }[] }
    expect(body.code).toBe('invalid')
    expect(body.issues.map(({ path }) => path)).toContainEqual([
      'navigation',
      0,
      'link',
      'en',
      'label'
    ])
  })

  it('refuses a block the slot does not offer, and a slot that does not exist', async () => {
    expect((await send('PUT', '/slots/header', { ...header, block: 'split-hero' })).status).toBe(
      400
    )
    expect((await send('PUT', '/slots/header', { ...header, block: 'site-footer' })).status).toBe(
      400
    )
    expect((await send('PUT', '/slots/sidebar', header)).status).toBe(404)
  })

  it('refuses a schema version newer than the block', async () => {
    expect((await send('PUT', '/slots/header', { ...header, schemaVersion: 9 })).status).toBe(400)
  })

  it('lists the layouts, the default first', async () => {
    const { layouts } = (await (await send('GET', '/layouts')).json()) as { layouts: string[] }
    expect(layouts).toEqual(['default', 'minimal', 'bare'])
  })
})
