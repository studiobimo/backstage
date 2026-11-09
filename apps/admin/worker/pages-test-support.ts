import { afterAll, beforeAll, beforeEach } from 'vitest'

import app from './index'
import { migrationStatements } from './test-migrations'
import { openTestEnv } from './test-env'

const migrations = migrationStatements('0000_init', '0003_page_layout', '0004_page_seo_title')

const { dispose, db, env } = await openTestEnv()

export const send = (method: string, path: string, body?: unknown) =>
  app.request(
    `/api/v1/pages${path}`,
    {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    },
    env.localDevelopment
  )

export const regular = (slug: string) => ({
  isHome: false,
  slugs: { en: slug, es: `${slug}-es` },
  titles: { en: 'About', es: 'Acerca' }
})
export const createRegularPage = async () =>
  ((await (await send('POST', '', regular('about'))).json()) as { page: { id: string } }).page.id

export const home = { isHome: true, titles: { en: 'Home', es: 'Inicio' } }

const tables = ['page_blocks', 'page_locales', 'pages']

export const useFreshPagesDb = () => {
  afterAll(dispose)
  beforeAll(async () => {
    const dropped = ['page_blocks', 'page_locales', 'pages', 'media', 'users']
    await db.batch(dropped.map((table) => db.prepare(`DROP TABLE IF EXISTS ${table}`)))
    await db.batch(migrations.map((statement) => db.prepare(statement)))
  })
  beforeEach(async () => {
    await db.batch(tables.map((table) => db.prepare(`DELETE FROM ${table}`)))
  })
}

export const versionOf = async (id: string) =>
  ((await (await send('GET', `/${id}/blocks`)).json()) as { version: number }).version

export const saveBlocks = async (id: string, blocks: unknown[], expectedVersion?: number) =>
  send('PUT', `/${id}/blocks`, {
    blocks,
    expectedVersion: expectedVersion ?? (await versionOf(id))
  })

export const saveSeo = async (id: string, seo: unknown, expectedVersion?: number) =>
  send('PUT', `/${id}/seo`, {
    ...(seo as object),
    expectedVersion: expectedVersion ?? (await versionOf(id))
  })

export const saveLayout = async (id: string, layout: string, expectedVersion?: number) =>
  send('PUT', `/${id}/layout`, {
    layout,
    expectedVersion: expectedVersion ?? (await versionOf(id))
  })
