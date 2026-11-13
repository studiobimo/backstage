import { API_ERROR } from '../errors.ts'
import { Hono } from 'hono'

import { respondWithError } from './respond.ts'
import { siteOriginOf } from './spa.ts'
import type { AdminEnv } from './env.ts'

export const siteOriginRoutes = () =>
  new Hono<{ Bindings: AdminEnv }>().get('/', (c) => {
    const origin = siteOriginOf(c.env)
    return origin ? c.json({ origin }) : respondWithError(c, API_ERROR.notFound)
  })
