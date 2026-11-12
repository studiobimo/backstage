import { Hono } from 'hono'

import { resolveLocaleConfig, type Registry } from '../index.ts'
import type { AdminEnv } from './env.ts'

export const configRoutes = (registry: Registry) =>
  new Hono<{ Bindings: AdminEnv }>().get('/', (c) => c.json(resolveLocaleConfig(registry)))
