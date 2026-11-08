import type { Registry } from '@studiobimo/backstage'
import { Hono } from 'hono'

import { blocksRoutes } from './blocks'

export const v1Routes = (registry: Registry) =>
  new Hono<{ Bindings: Env }>().route('/blocks', blocksRoutes(registry))
