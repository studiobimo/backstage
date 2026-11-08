import type { Registry } from '@studiobimo/backstage'
import { Hono } from 'hono'

import { blocksRoutes } from './blocks'
import { pagesRoutes } from './pages'
import { settingsRoutes } from './settings'

export const v1Routes = (registry: Registry) =>
  new Hono<{ Bindings: Env }>()
    .route('/blocks', blocksRoutes(registry))
    .route('/pages', pagesRoutes(registry))
    .route('/settings', settingsRoutes())
