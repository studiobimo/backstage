import {
  API_ERROR,
  createPage,
  deletePage,
  findPage,
  listPages,
  PAGE_WRITE,
  pageInputSchema,
  renamePage,
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
  [PAGE_WRITE.homeMismatch]: API_ERROR.invalid
}

const readInput = async (c: PagesContext) => {
  const body = await c.req.json().catch(() => null)
  return pageInputSchema.safeParse(body)
}

const failureOf = (c: PagesContext, outcome: PageWrite) =>
  outcome === PAGE_WRITE.ok ? null : respondWithError(c, WRITE_ERRORS[outcome])

export const pagesRoutes = () =>
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
