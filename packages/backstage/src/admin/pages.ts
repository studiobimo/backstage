import {
  API_ERROR,
  createPage,
  deletePage,
  findPage,
  listMissingTranslations,
  listPageBlocks,
  listPages,
  LOCALES,
  PAGE_WRITE,
  pageInputSchema,
  renamePageSchema,
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
  type PageWrite
} from '../index.ts'
import type { Context } from 'hono'
import { Hono } from 'hono'

import type { AccessEnv } from './auth.ts'
import {
  readJsonBody,
  RESPONSE_STATUS,
  respondWithError,
  respondWithStale,
  versionedWrite
} from './respond.ts'
import { rebuildPublishedIndex, removeSnapshots } from './snapshots.ts'

type PagesContext = Context<AccessEnv>

const NO_MISSING = Object.fromEntries(LOCALES.map((locale) => [locale, 0])) as MissingByLocale

const WRITE_ERRORS: Record<Exclude<PageWrite, 'ok' | 'stale'>, ApiError> = {
  [PAGE_WRITE.slugTaken]: API_ERROR.slugTaken,
  [PAGE_WRITE.homeTaken]: API_ERROR.homeTaken,
  [PAGE_WRITE.notFound]: API_ERROR.notFound,
  [PAGE_WRITE.homeMismatch]: API_ERROR.invalid,
  [PAGE_WRITE.unknownMedia]: API_ERROR.invalid
}

export const respondStale = async (c: PagesContext, id: string) =>
  respondWithStale(c, await readPageStamp(c.env.DB, id))

const failureOf = async (c: PagesContext, id: string, outcome: PageWrite) => {
  if (outcome === PAGE_WRITE.ok) return null
  if (outcome === PAGE_WRITE.stale) return respondStale(c, id)
  return respondWithError(c, WRITE_ERRORS[outcome])
}

const blocksResponse = async (c: PagesContext, id: string) => {
  const page = await findPage(c.env.DB, id)
  if (!page) return null
  return c.json({
    blocks: await listPageBlocks(c.env.DB, id),
    version: page.version,
    layout: page.layout
  })
}

const seoResponse = async (c: PagesContext, id: string) => {
  const [seo, page] = await Promise.all([readPageSeo(c.env.DB, id), findPage(c.env.DB, id)])
  return seo && page ? c.json({ seo, version: page.version }) : null
}

const listPageSummaries = async (d1: D1Database, registry: Registry) => {
  const [pages, missing] = await Promise.all([listPages(d1), listMissingTranslations(d1, registry)])
  return pages.map((page) => ({ ...page, missing: missing.get(page.id) ?? NO_MISSING }))
}

export const pagesRoutes = (registry: Registry) =>
  new Hono<AccessEnv>()
    .get('/', async (c) => c.json({ pages: await listPageSummaries(c.env.DB, registry) }))
    .post('/', async (c) => {
      const body = await readJsonBody(c, pageInputSchema)
      if (!body.ok) return body.response
      const id = crypto.randomUUID()
      const failure = await failureOf(c, id, await createPage(c.env.DB, body.data, id))
      return failure ?? c.json({ page: await findPage(c.env.DB, id) }, RESPONSE_STATUS.created)
    })
    .put('/:id', async (c) => {
      const body = await readJsonBody(c, renamePageSchema)
      if (!body.ok) return body.response
      const id = c.req.param('id')
      const { expectedVersion, ...input } = body.data
      const write = await versionedWrite(c, expectedVersion)
      const failure = await failureOf(c, id, await renamePage(c.env.DB, id, input, write))
      return failure ?? c.json({ page: await findPage(c.env.DB, id) })
    })
    .delete('/:id', async (c) => {
      const id = c.req.param('id')
      const wasPublished = Boolean((await findPage(c.env.DB, id))?.publishedAt)
      if (wasPublished) await removeSnapshots(c.env.SITE, id)
      const failure = await failureOf(c, id, await deletePage(c.env.DB, id))
      if (wasPublished) await rebuildPublishedIndex(c, c.env.DB, c.env.SITE)
      return failure ?? c.body(null, RESPONSE_STATUS.noContent)
    })
    .get('/:id/blocks', async (c) => {
      const id = c.req.param('id')
      return (await blocksResponse(c, id)) ?? respondWithError(c, API_ERROR.notFound)
    })
    .put('/:id/blocks', async (c) => {
      const body = await readJsonBody(c, savePageBlocksSchema)
      if (!body.ok) return body.response
      if (
        body.data.blocks.some(({ block }) => !registry.get(block) || registry.isSlotBlock(block))
      ) {
        return respondWithError(c, API_ERROR.invalid)
      }
      const id = c.req.param('id')
      const write = await versionedWrite(c, body.data.expectedVersion)
      const failure = await failureOf(
        c,
        id,
        await replacePageBlocks(c.env.DB, id, body.data.blocks, write)
      )
      return failure ?? (await blocksResponse(c, id)) ?? respondWithError(c, API_ERROR.notFound)
    })
    .put('/:id/layout', async (c) => {
      const body = await readJsonBody(c, savePageLayoutSchema)
      if (!body.ok) return body.response
      if (!registry.hasLayout(body.data.layout)) return respondWithError(c, API_ERROR.invalid)
      const id = c.req.param('id')
      const write = await versionedWrite(c, body.data.expectedVersion)
      const failure = await failureOf(
        c,
        id,
        await setPageLayout(c.env.DB, id, body.data.layout, write)
      )
      return failure ?? c.json({ page: await findPage(c.env.DB, id) })
    })
    .get('/:id/seo', async (c) => {
      const id = c.req.param('id')
      return (await seoResponse(c, id)) ?? respondWithError(c, API_ERROR.notFound)
    })
    .put('/:id/seo', async (c) => {
      const body = await readJsonBody(c, savePageSeoSchema)
      if (!body.ok) return body.response
      const { expectedVersion, ...seo } = body.data
      const id = c.req.param('id')
      const write = await versionedWrite(c, expectedVersion)
      const failure = await failureOf(c, id, await writePageSeo(c.env.DB, id, seo, write))
      return failure ?? (await seoResponse(c, id)) ?? respondWithError(c, API_ERROR.notFound)
    })
