import { describe, expect, it } from 'vitest'

import { db, saveBlocks, sendRecording, useFreshPagesDb } from './pages-test-support'

const PAGE_COUNT = 100
const BLOCKS_PER_PAGE = 20
const LIST_QUERY_BUDGET = 4
const ONE_PAGE_QUERY_BUDGET = 5
const SEED_TIMEOUT_MS = 30_000

interface Summary {
  id: string
  missing: { en: number; es: number }
}

const hero = (index: number) => ({
  id: crypto.randomUUID(),
  block: 'split-hero',
  schemaVersion: 1,
  content: { title: index % 2 === 0 ? { en: 'Hello' } : { en: 'Hi', es: 'Hola' }, body: {} }
})

const ROWS_PER_STATEMENT = 100

const quoted = (value: string | number) => (typeof value === 'number' ? `${value}` : `'${value}'`)

const valuesOf = (rows: (string | number)[][]) =>
  rows.map((row) => `(${row.map(quoted).join(', ')})`).join(', ')

const insertAll = (table: string, columns: string[], rows: (string | number)[][]) =>
  Array.from({ length: Math.ceil(rows.length / ROWS_PER_STATEMENT) }, (_, chunk) =>
    db.prepare(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuesOf(
        rows.slice(chunk * ROWS_PER_STATEMENT, (chunk + 1) * ROWS_PER_STATEMENT)
      )}`
    )
  )

const seedSite = async () => {
  const now = Date.now()
  const ids = Array.from({ length: PAGE_COUNT }, () => crypto.randomUUID())
  const blockRows = ids.flatMap((id) =>
    Array.from({ length: BLOCKS_PER_PAGE }, (_, position) => {
      const block = hero(position)
      return [
        block.id,
        id,
        position,
        block.block,
        block.schemaVersion,
        JSON.stringify(block.content)
      ]
    })
  )
  await db.batch([
    ...insertAll(
      'pages',
      ['id', 'is_home', 'layout', 'version', 'created_at', 'updated_at'],
      ids.map((id, page) => [id, 0, 'default', 1, now + page, now])
    ),
    ...insertAll(
      'page_locales',
      ['page_id', 'locale', 'slug', 'title'],
      ids.flatMap((id, page) =>
        ['en', 'es'].map((locale) => [id, locale, `${locale}-${page}`, `Page ${page}`])
      )
    ),
    ...insertAll(
      'page_blocks',
      ['id', 'page_id', 'position', 'block', 'schema_version', 'content'],
      blockRows
    )
  ])
  return ids
}

const missingSpanish = BLOCKS_PER_PAGE / 2

const readBlocks = (statements: string[]) =>
  statements.filter((statement) => statement.includes('"page_blocks"'))

const listTwice = async () => {
  const first = await sendRecording('GET', '')
  const second = await sendRecording('GET', '')
  return { first, second, pages: ((await second.response.json()) as { pages: Summary[] }).pages }
}

describe('the pages list on a large site', () => {
  useFreshPagesDb()

  it(
    'counts rows that have no stored counts once, then reads no blocks and stays within a handful of queries',
    async () => {
      await seedSite()
      const { first, second, pages } = await listTwice()
      expect(first.statements.length).toBeGreaterThan(0)
      expect(pages).toHaveLength(PAGE_COUNT)
      expect(pages.every(({ missing }) => missing.es === missingSpanish)).toBe(true)
      expect(second.statements.length).toBeGreaterThan(0)
      expect(readBlocks(second.statements)).toEqual([])
      expect(second.statements.length).toBeLessThanOrEqual(LIST_QUERY_BUDGET)
    },
    SEED_TIMEOUT_MS
  )

  it(
    'recounts only the page that was saved',
    async () => {
      const [id] = await seedSite()
      await listTwice()
      await saveBlocks(id!, [hero(0), hero(1)])
      const { first, pages } = await listTwice()
      expect(pages.find((page) => page.id === id)?.missing).toEqual({ en: 0, es: 1 })
      expect(pages.filter(({ missing }) => missing.es === missingSpanish)).toHaveLength(
        PAGE_COUNT - 1
      )
      expect(readBlocks(first.statements)).toHaveLength(1)
    },
    SEED_TIMEOUT_MS
  )

  it(
    'looks up one page with a filtered query, not all of them',
    async () => {
      const [id] = await seedSite()
      const { response, statements } = await sendRecording('GET', `/${id}/seo`)
      expect(response.status).toBe(200)
      expect(statements.length).toBeGreaterThan(0)
      expect(statements.length).toBeLessThanOrEqual(ONE_PAGE_QUERY_BUDGET)
      expect(statements.every((statement) => statement.includes('where'))).toBe(true)
    },
    SEED_TIMEOUT_MS
  )
})
