import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterAll, beforeAll, beforeEach } from 'vitest'

import app from './index'
import { openTestEnv } from './test-env'

const migration = readFileSync(
  resolve(import.meta.dirname, '../../../packages/backstage/migrations/0000_init.sql'),
  'utf8'
)

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
    await db.batch(
      migration.split('--> statement-breakpoint').map((statement) => db.prepare(statement.trim()))
    )
  })
  beforeEach(async () => {
    await db.batch(tables.map((table) => db.prepare(`DELETE FROM ${table}`)))
  })
}
