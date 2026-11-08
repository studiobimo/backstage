import { layoutNames, type Registry } from '@studiobimo/backstage'
import { Hono } from 'hono'

export const layoutsRoutes = (registry: Registry) =>
  new Hono<{ Bindings: Env }>().get('/', (c) => c.json({ layouts: layoutNames(registry) }))
