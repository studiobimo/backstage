import { API_ERROR } from '@studiobimo/backstage'
import { Hono } from 'hono'

import { respondWithError } from './respond'
import { siteOriginOf } from './spa'

export const siteOriginRoutes = () =>
  new Hono<{ Bindings: Env }>().get('/', (c) => {
    const origin = siteOriginOf(c.env)
    return origin ? c.json({ origin }) : respondWithError(c, API_ERROR.notFound)
  })
