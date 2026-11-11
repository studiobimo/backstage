import { layoutNames, type Registry } from '../index.ts'
import { Hono } from 'hono'

export const layoutsRoutes = (registry: Registry) =>
  new Hono<{ Bindings: Env }>().get('/', (c) => c.json({ layouts: layoutNames(registry) }))
