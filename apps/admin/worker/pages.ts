import {
  API_ERROR,
  createPage,
  deletePage,
  findPage,
  listPageBlocks,
  listPages,
  PAGE_WRITE,
  pageBlocksSchema,
  pageInputSchema,
  pageLayoutInputSchema,
  pageSeoSchema,
  readPageSeo,
  renamePage,
  replacePageBlocks,
  setPageLayout,
  writePageSeo,
  type Registry,
  type ApiError,
  type PageWrite
} from '@studiobimo/backstage'
import type { Context } from 'hono'
import { Hono } from 'hono'

import { respondWithError } from './respond'

type PagesContext = Context<{ Bindings: Env }>

const WRITE_ERRORS: Record<Exclude<PageWrite, 'ok'>, ApiError> = {
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

const failureOf = (c: PagesContext, outcome: PageWrite) =>
  outcome === PAGE_WRITE.ok ? null : respondWithError(c, WRITE_ERRORS[outcome])

export const pagesRoutes = (registry: Registry) =>
  new Hono<{ Bindings: Env }>()
    .get('/', async (c) => c.json({ pages: await listPages(c.env.DB!) }))
    .post('/', async (c) => {
      const parsed = await readInput(c)
      if (!parsed.success) return respondWithError(c, API_ERROR.invalid)
      const id = crypto.randomUUID()
      const failure = failureOf(c, await createPage(c.env.DB!, parsed.data, id))
      return failure ?? c.json({ page: await findPage(c.env.DB!, id) }, 201)
    })
    .put('/:id', async (c) => {
      const parsed = await readInput(c)
      if (!parsed.success) return respondWithError(c, API_ERROR.invalid)
      const id = c.req.param('id')
      const failure = failureOf(c, await renamePage(c.env.DB!, id, parsed.data))
      return failure ?? c.json({ page: await findPage(c.env.DB!, id) })
    })
    .delete('/:id', async (c) => {
      const failure = failureOf(c, await deletePage(c.env.DB!, c.req.param('id')))
      return failure ?? c.body(null, 204)
    })
    .get('/:id/blocks', async (c) => {
      const id = c.req.param('id')
      if (!(await findPage(c.env.DB!, id))) return respondWithError(c, API_ERROR.notFound)
      return c.json({ blocks: await listPageBlocks(c.env.DB!, id) })
    })
    .put('/:id/blocks', async (c) => {
      const parsed = pageBlocksSchema.safeParse(await c.req.json().catch(() => null))
      if (
        !parsed.success ||
        parsed.data.blocks.some(({ block }) => !registry.get(block) || registry.isSlotBlock(block))
      ) {
        return respondWithError(c, API_ERROR.invalid)
      }
      const id = c.req.param('id')
      const failure = failureOf(c, await replacePageBlocks(c.env.DB!, id, parsed.data.blocks))
      return failure ?? c.json({ blocks: await listPageBlocks(c.env.DB!, id) })
    })
    .put('/:id/layout', async (c) => {
      const parsed = pageLayoutInputSchema.safeParse(await c.req.json().catch(() => null))
      if (!parsed.success || !registry.hasLayout(parsed.data.layout)) {
        return respondWithError(c, API_ERROR.invalid)
      }
      const id = c.req.param('id')
      const failure = failureOf(c, await setPageLayout(c.env.DB!, id, parsed.data.layout))
      return failure ?? c.json({ page: await findPage(c.env.DB!, id) })
    })
    .get('/:id/seo', async (c) => {
      const seo = await readPageSeo(c.env.DB!, c.req.param('id'))
      return seo ? c.json({ seo }) : respondWithError(c, API_ERROR.notFound)
    })
    .put('/:id/seo', async (c) => {
      const parsed = pageSeoSchema.safeParse(await c.req.json().catch(() => null))
      if (!parsed.success) return respondWithError(c, API_ERROR.invalid)
      const id = c.req.param('id')
      const failure = failureOf(c, await writePageSeo(c.env.DB!, id, parsed.data))
      return failure ?? c.json({ seo: await readPageSeo(c.env.DB!, id) })
    })
