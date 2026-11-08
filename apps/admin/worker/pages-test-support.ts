import { afterAll, beforeAll, beforeEach } from 'vitest'

import app from './index'
import { migrationStatements } from './test-migrations'
import { openTestEnv } from './test-env'

const migrations = migrationStatements('0000_init', '0003_page_layout')

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
