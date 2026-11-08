import { describeBlocks, type Registry } from '@studiobimo/backstage'
import { Hono } from 'hono'

export const blocksRoutes = (registry: Registry) =>
  new Hono<{ Bindings: Env }>().get('/', (c) => c.json({ blocks: describeBlocks(registry) }))
