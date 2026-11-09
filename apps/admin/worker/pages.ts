import {
  API_ERROR,
  createPage,
  deletePage,
  ensureUser,
  errorBody,
  findPage,
  listMissingTranslations,
  listPageBlocks,
  listPages,
  LOCALES,
  PAGE_WRITE,
  pageInputSchema,
  readPageSeo,
  readPageStamp,
  renamePage,
  replacePageBlocks,
  savePageBlocksSchema,
  savePageLayoutSchema,
  savePageSeoSchema,
  setPageLayout,
  writePageSeo,
  type Registry,
  type ApiError,
  type MissingByLocale,
  type PageWrite,
  type VersionedWrite
} from '@studiobimo/backstage'
import type { Context } from 'hono'
import { Hono } from 'hono'

import type { AccessEnv } from './auth'
import { RESPONSE_STATUS, respondWithError } from './respond'

type PagesContext = Context<AccessEnv>

const NO_MISSING = Object.fromEntries(LOCALES.map((locale) => [locale, 0])) as MissingByLocale

const WRITE_ERRORS: Record<Exclude<PageWrite, 'ok' | 'stale'>, ApiError> = {
  [PAGE_WRITE.slugTaken]: API_ERROR.slugTaken,
  [PAGE_WRITE.homeTaken]: API_ERROR.homeTaken,
  [PAGE_WRITE.notFound]: API_ERROR.notFound,
  [PAGE_WRITE.homeMismatch]: API_ERROR.invalid,
  [PAGE_WRITE.unknownMedia]: API_ERROR.invalid
}

const readInput = async (c: PagesContext) => {
  const body = await c.req.json().catch(() => null)
  return pageInputSchema.safeParse(body)
}

const respondStale = async (c: PagesContext, id: string) =>
  c.json(
    { ...errorBody(API_ERROR.staleVersion), current: await readPageStamp(c.env.DB!, id) },
    API_ERROR.staleVersion.status
  )

const failureOf = async (c: PagesContext, id: string, outcome: PageWrite) => {
  if (outcome === PAGE_WRITE.ok) return null
  if (outcome === PAGE_WRITE.stale) return respondStale(c, id)
  return respondWithError(c, WRITE_ERRORS[outcome])
}

const blocksResponse = async (c: PagesContext, id: string) => {
  const page = await findPage(c.env.DB!, id)
  if (!page) return null
  return c.json({
    blocks: await listPageBlocks(c.env.DB!, id),
    version: page.version,
    layout: page.layout
  })
}

const seoResponse = async (c: PagesContext, id: string) => {
  const [seo, page] = await Promise.all([readPageSeo(c.env.DB!, id), findPage(c.env.DB!, id)])
  return seo && page ? c.json({ seo, version: page.version }) : null
}

const versionedWrite = async (
  c: PagesContext,
  expectedVersion: number
): Promise<VersionedWrite> => ({
  expectedVersion,
  editorId: await ensureUser(c.env.DB!, c.get('editor'))
})

const listPageSummaries = async (d1: D1Database, registry: Registry) => {
  const [pages, missing] = await Promise.all([listPages(d1), listMissingTranslations(d1, registry)])
  return pages.map((page) => ({ ...page, missing: missing.get(page.id) ?? NO_MISSING }))
}

export const pagesRoutes = (registry: Registry) =>
  new Hono<AccessEnv>()
    .get('/', async (c) => c.json({ pages: await listPageSummaries(c.env.DB!, registry) }))
    .post('/', async (c) => {
      const parsed = await readInput(c)
      if (!parsed.success) return respondWithError(c, API_ERROR.invalid)
      const id = crypto.randomUUID()
      const failure = await failureOf(c, id, await createPage(c.env.DB!, parsed.data, id))
      return failure ?? c.json({ page: await findPage(c.env.DB!, id) }, RESPONSE_STATUS.created)
    })
    .put('/:id', async (c) => {
      const parsed = await readInput(c)
      if (!parsed.success) return respondWithError(c, API_ERROR.invalid)
      const id = c.req.param('id')
      const failure = await failureOf(c, id, await renamePage(c.env.DB!, id, parsed.data))
      return failure ?? c.json({ page: await findPage(c.env.DB!, id) })
    })
    .delete('/:id', async (c) => {
      const id = c.req.param('id')
      const failure = await failureOf(c, id, await deletePage(c.env.DB!, id))
      return failure ?? c.body(null, RESPONSE_STATUS.noContent)
    })
    .get('/:id/blocks', async (c) => {
      const id = c.req.param('id')
      return (await blocksResponse(c, id)) ?? respondWithError(c, API_ERROR.notFound)
    })
    .put('/:id/blocks', async (c) => {
      const parsed = savePageBlocksSchema.safeParse(await c.req.json().catch(() => null))
      if (
        !parsed.success ||
        parsed.data.blocks.some(({ block }) => !registry.get(block) || registry.isSlotBlock(block))
      ) {
        return respondWithError(c, API_ERROR.invalid)
      }
      const id = c.req.param('id')
      const write = await versionedWrite(c, parsed.data.expectedVersion)
      const failure = await failureOf(
        c,
        id,
        await replacePageBlocks(c.env.DB!, id, parsed.data.blocks, write)
      )
      return failure ?? (await blocksResponse(c, id)) ?? respondWithError(c, API_ERROR.notFound)
    })
    .put('/:id/layout', async (c) => {
      const parsed = savePageLayoutSchema.safeParse(await c.req.json().catch(() => null))
      if (!parsed.success || !registry.hasLayout(parsed.data.layout)) {
        return respondWithError(c, API_ERROR.invalid)
      }
      const id = c.req.param('id')
      const write = await versionedWrite(c, parsed.data.expectedVersion)
      const failure = await failureOf(
        c,
        id,
        await setPageLayout(c.env.DB!, id, parsed.data.layout, write)
      )
      return failure ?? c.json({ page: await findPage(c.env.DB!, id) })
    })
    .get('/:id/seo', async (c) => {
      const id = c.req.param('id')
      return (await seoResponse(c, id)) ?? respondWithError(c, API_ERROR.notFound)
    })
    .put('/:id/seo', async (c) => {
      const parsed = savePageSeoSchema.safeParse(await c.req.json().catch(() => null))
      if (!parsed.success) return respondWithError(c, API_ERROR.invalid)
      const { expectedVersion, ...seo } = parsed.data
      const id = c.req.param('id')
      const write = await versionedWrite(c, expectedVersion)
      const failure = await failureOf(c, id, await writePageSeo(c.env.DB!, id, seo, write))
      return failure ?? (await seoResponse(c, id)) ?? respondWithError(c, API_ERROR.notFound)
    })
