import { afterAll, beforeAll, beforeEach } from 'vitest'

import app from './index'
import { migrationStatements } from './test-migrations'
import { openTestEnv } from './test-env'

const migrations = migrationStatements(
  '0000_init',
  '0001_site_settings',
  '0003_page_layout',
  '0004_page_seo_title',
  '0005_pages_single_home',
  '0006_pages_missing_translations'
)

const { dispose, db, env } = await openTestEnv()

export { db }

const request = (
  bindings: typeof env.localDevelopment,
  method: string,
  path: string,
  body?: unknown
) =>
  app.request(
    `/api/v1/pages${path}`,
    {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    },
    bindings
  )

export const send = (
  method: string,
  path: string,
  body?: unknown,
  bindings: Partial<typeof env.localDevelopment> = {}
) => request({ ...env.localDevelopment, ...bindings }, method, path, body)

const recordingDb = (statements: string[]) =>
  new Proxy(db, {
    get(target, property) {
      const value = Reflect.get(target, property)
      if (property === 'prepare') {
        return (sql: string) => {
          statements.push(sql)
          return target.prepare(sql)
        }
      }
      return typeof value === 'function' ? value.bind(target) : value
    }
  })

export const sendRecording = async (method: string, path: string) => {
  const statements: string[] = []
  const response = await request(
    { ...env.localDevelopment, DB: recordingDb(statements) },
    method,
    path
  )
  return { response, statements }
}

export const regular = (slug: string) => ({
  isHome: false,
  slugs: { en: slug, es: `${slug}-es` },
  titles: { en: 'About', es: 'Acerca' }
})
export const createRegularPage = async () =>
  ((await (await send('POST', '', regular('about'))).json()) as { page: { id: string } }).page.id

export const kv = env.localDevelopment.SITE!

export const home = { isHome: true, titles: { en: 'Home', es: 'Inicio' } }

const tables = ['page_blocks', 'page_locales', 'pages', 'media', 'site_settings']

export const useFreshPagesDb = () => {
  afterAll(dispose)
  beforeAll(async () => {
    const dropped = ['page_blocks', 'page_locales', 'pages', 'media', 'users', 'site_settings']
    await db.batch(dropped.map((table) => db.prepare(`DROP TABLE IF EXISTS ${table}`)))
    await db.batch(migrations.map((statement) => db.prepare(statement)))
  })
  beforeEach(async () => {
    await db.batch(tables.map((table) => db.prepare(`DELETE FROM ${table}`)))
    const { keys } = await kv.list()
    await Promise.all(keys.map(({ name }) => kv.delete(name)))
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
