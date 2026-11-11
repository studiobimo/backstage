import { API_ERROR } from '../index.ts'
import { Hono } from 'hono'

import { respondWithError } from './respond.ts'
import { siteOriginOf } from './spa.ts'

export const siteOriginRoutes = () =>
  new Hono<{ Bindings: Env }>().get('/', (c) => {
    const origin = siteOriginOf(c.env)
    return origin ? c.json({ origin }) : respondWithError(c, API_ERROR.notFound)
  })
