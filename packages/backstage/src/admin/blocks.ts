import { describeBlocks, type Registry } from '../index.ts'
import { Hono } from 'hono'
import type { AdminEnv } from './env.ts'

export const blocksRoutes = (registry: Registry) =>
  new Hono<{ Bindings: AdminEnv }>().get('/', (c) => c.json({ blocks: describeBlocks(registry) }))
