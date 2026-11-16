import { API_ERROR, type ApiError } from '../errors.ts'
import {
  createPage,
  deletePage,
  findPage,
  listMissingTranslations,
  listPageBlocks,
  listPages,
  PAGE_WRITE,
  readPageSeo,
  readPageStamp,
  renamePage,
  replacePageBlocks,
  setPageLayout,
  writePageSeo,
  type PageWrite
} from '../db/pages.ts'
import {
  pageInputSchema,
  renamePageSchema,
  savePageBlocksSchema,
  savePageLayoutSchema,
  savePageSeoSchema,
  type PageBlock
} from '../pages.ts'
import { resolveLocaleConfig } from '../locales.ts'
import { openStoredContent, type Registry } from '../blocks.ts'
import type { MissingByLocale } from '../translations.ts'
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

const noMissing = (locales: readonly string[]): MissingByLocale =>
  Object.fromEntries(locales.map((locale) => [locale, 0]))

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

const openPageBlock = (registry: Registry, block: PageBlock): PageBlock => {
  const definition = registry.get(block.block)
  if (!definition) return block
  const opened = openStoredContent(definition, block.schemaVersion, block.content)
  return { ...block, ...opened, content: opened.content as PageBlock['content'] }
}

const blocksResponse = async (c: PagesContext, registry: Registry, id: string) => {
  const page = await findPage(c.env.DB, id)
  if (!page) return respondWithError(c, API_ERROR.notFound)
  const blocks = await listPageBlocks(c.env.DB, id)
  return c.json({
    blocks: blocks.map((block) => openPageBlock(registry, block)),
    version: page.version,
    layout: page.layout
  })
}

const seoResponse = async (c: PagesContext, id: string, locales: readonly string[]) => {
  const [seo, page] = await Promise.all([
    readPageSeo(c.env.DB, id, locales),
    findPage(c.env.DB, id)
  ])
  return seo && page ? c.json({ seo, version: page.version }) : null
}

const listPageSummaries = async (d1: D1Database, registry: Registry) => {
  const [pages, missing] = await Promise.all([listPages(d1), listMissingTranslations(d1, registry)])
  const empty = noMissing(resolveLocaleConfig(registry).locales)
  return pages.map((page) => ({ ...page, missing: missing.get(page.id) ?? empty }))
}

export const pagesRoutes = (registry: Registry) => {
  const { locales } = resolveLocaleConfig(registry)
  return new Hono<AccessEnv>()
    .get('/', async (c) => c.json({ pages: await listPageSummaries(c.env.DB, registry) }))
    .post('/', async (c) => {
      const body = await readJsonBody(c, pageInputSchema(locales))
      if (!body.ok) return body.response
      const id = crypto.randomUUID()
      const failure = await failureOf(c, id, await createPage(c.env.DB, body.data, id))
      return failure ?? c.json({ page: await findPage(c.env.DB, id) }, RESPONSE_STATUS.created)
    })
    .put('/:id', async (c) => {
      const body = await readJsonBody(c, renamePageSchema(locales))
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
      if (wasPublished) await removeSnapshots(c.env.SITE, id, locales)
      const failure = await failureOf(c, id, await deletePage(c.env.DB, id))
      if (wasPublished) await rebuildPublishedIndex(c, c.env.DB, c.env.SITE)
      return failure ?? c.body(null, RESPONSE_STATUS.noContent)
    })
    .get('/:id/blocks', async (c) => {
      const id = c.req.param('id')
      return blocksResponse(c, registry, id)
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
      return failure ?? blocksResponse(c, registry, id)
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
      return (await seoResponse(c, id, locales)) ?? respondWithError(c, API_ERROR.notFound)
    })
    .put('/:id/seo', async (c) => {
      const body = await readJsonBody(c, savePageSeoSchema(locales))
      if (!body.ok) return body.response
      const { expectedVersion, seo } = body.data
      const id = c.req.param('id')
      const write = await versionedWrite(c, expectedVersion)
      const failure = await failureOf(c, id, await writePageSeo(c.env.DB, id, seo, write))
      return (
        failure ?? (await seoResponse(c, id, locales)) ?? respondWithError(c, API_ERROR.notFound)
      )
    })
}
