import { describe, expect, it } from 'vitest'

import { db, saveBlocks, send, sendRecording, useFreshPagesDb } from './pages-test-support'

const PAGE_COUNT = 100
const BLOCKS_PER_PAGE = 20
const LIST_QUERY_BUDGET = 3
const ONE_PAGE_QUERY_BUDGET = 4
const SEED_TIMEOUT_MS = 60_000

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

const seedSite = async () => {
  const ids: string[] = []
  for (let page = 0; page < PAGE_COUNT; page += 1) {
    const created = await send('POST', '', {
      isHome: false,
      slugs: { en: `page-${page}`, es: `pagina-${page}` },
      titles: { en: `Page ${page}`, es: `Pagina ${page}` }
    })
    const { page: saved } = (await created.json()) as { page: { id: string } }
    await saveBlocks(
      saved.id,
      Array.from({ length: BLOCKS_PER_PAGE }, (_, index) => hero(index))
    )
    ids.push(saved.id)
  }
  return ids
}

const missingSpanish = BLOCKS_PER_PAGE / 2

const readBlocks = (statements: string[]) =>
  statements.filter((statement) => statement.includes('"page_blocks"'))

describe('the pages list on a large site', () => {
  useFreshPagesDb()

  it(
    'reads no blocks and stays within a handful of queries',
    async () => {
      await seedSite()
      const { response, statements } = await sendRecording('GET', '')
      const { pages } = (await response.json()) as { pages: Summary[] }
      expect(pages).toHaveLength(PAGE_COUNT)
      expect(pages.every(({ missing }) => missing.es === missingSpanish)).toBe(true)
      expect(readBlocks(statements)).toEqual([])
      expect(statements.length).toBeGreaterThan(0)
      expect(statements.length).toBeLessThanOrEqual(LIST_QUERY_BUDGET)
    },
    SEED_TIMEOUT_MS
  )

  it(
    'counts pages saved before the counts were stored, once',
    async () => {
      const ids = await seedSite()
      await db.prepare('UPDATE pages SET missing_translations = NULL').run()
      const first = await sendRecording('GET', '')
      const { pages } = (await first.response.json()) as { pages: Summary[] }
      expect(pages.map(({ id }) => id).sort()).toEqual([...ids].sort())
      expect(pages.every(({ missing }) => missing.es === missingSpanish)).toBe(true)
      const second = await sendRecording('GET', '')
      expect(second.statements.length).toBeGreaterThan(0)
      expect(readBlocks(second.statements)).toEqual([])
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
