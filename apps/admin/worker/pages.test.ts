import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'

import app from './index'

const migration = readFileSync(
  resolve(import.meta.dirname, '../../../packages/backstage/migrations/0000_init.sql'),
  'utf8'
)

const platform = await getPlatformProxy<Env>({ persist: false })
afterAll(() => platform.dispose())

const env = { ...platform.env, DEV_AUTH: 'true' }
const db = platform.env.DB!

const send = (method: string, path: string, body?: unknown) =>
  app.request(
    `/api/v1/pages${path}`,
    {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    },
    env
  )

const regular = (slug: string) => ({
  isHome: false,
  slugs: { en: slug, es: `${slug}-es` },
  titles: { en: 'About', es: 'Acerca' }
})
const home = { isHome: true, titles: { en: 'Home', es: 'Inicio' } }

const tables = ['page_blocks', 'page_locales', 'pages']

describe('pages API', () => {
  beforeAll(async () => {
    const dropped = ['page_blocks', 'page_locales', 'pages', 'media', 'users']
    await db.batch(dropped.map((table) => db.prepare(`DROP TABLE IF EXISTS ${table}`)))
    await db.batch(
      migration.split('--> statement-breakpoint').map((statement) => db.prepare(statement.trim()))
    )
  })
  beforeEach(async () => {
    await db.batch(tables.map((table) => db.prepare(`DELETE FROM ${table}`)))
  })

  it('creates a page with a slug for each locale', async () => {
    const response = await send('POST', '', regular('about'))
    expect(response.status).toBe(201)
    const { page } = (await response.json()) as { page: { locales: { slug: string }[] } }
    expect(page.locales.map((locale) => locale.slug).sort()).toEqual(['about', 'about-es'])
  })

  it('creates the home page without slugs, once', async () => {
    const first = await send('POST', '', home)
    const { page } = (await first.json()) as { page: { locales: { slug: null }[] } }
    expect(page.locales.map((locale) => locale.slug)).toEqual([null, null])
    expect((await send('POST', '', home)).status).toBe(409)
  })

  it('refuses a slug already used in the same locale', async () => {
    await send('POST', '', regular('about'))
    const response = await send('POST', '', regular('about'))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'slug_taken' })
  })

  it('refuses a missing or malformed slug', async () => {
    expect((await send('POST', '', { ...regular('Bad Slug') })).status).toBe(400)
    expect((await send('POST', '', { isHome: false, titles: home.titles })).status).toBe(400)
  })

  it('renames a page and frees its old slug', async () => {
    const created = (await (await send('POST', '', regular('about'))).json()) as {
      page: { id: string }
    }
    const renamed = await send('PUT', `/${created.page.id}`, regular('team'))
    expect(renamed.status).toBe(200)
    expect((await send('POST', '', regular('about'))).status).toBe(201)
  })

  it('refuses to turn a page into the home page', async () => {
    const created = (await (await send('POST', '', regular('about'))).json()) as {
      page: { id: string }
    }
    expect((await send('PUT', `/${created.page.id}`, home)).status).toBe(400)
  })

  it('deletes a page, then answers 404', async () => {
    const created = (await (await send('POST', '', regular('about'))).json()) as {
      page: { id: string }
    }
    expect((await send('DELETE', `/${created.page.id}`)).status).toBe(204)
    expect((await send('DELETE', `/${created.page.id}`)).status).toBe(404)
    const { pages } = (await (await send('GET', '')).json()) as { pages: unknown[] }
    expect(pages).toEqual([])
  })
})
