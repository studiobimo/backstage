import { layoutNames, type Registry } from '../blocks.ts'
import { Hono } from 'hono'
import type { AdminEnv } from './env.ts'

export const layoutsRoutes = (registry: Registry) =>
  new Hono<{ Bindings: AdminEnv }>().get('/', (c) => c.json({ layouts: layoutNames(registry) }))
