import { Hono } from 'hono'

import { resolveLocaleConfig } from '../locales.ts'
import type { Registry } from '../blocks.ts'
import type { AdminEnv } from './env.ts'

export const configRoutes = (registry: Registry) =>
  new Hono<{ Bindings: AdminEnv }>().get('/', (c) => c.json(resolveLocaleConfig(registry)))
