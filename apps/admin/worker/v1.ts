import type { Registry } from '@studiobimo/backstage'
import { Hono } from 'hono'

import { blocksRoutes } from './blocks'
import { layoutsRoutes } from './layouts'
import { pagesRoutes } from './pages'
import { settingsRoutes } from './settings'
import { slotsRoutes } from './slots'

export const v1Routes = (registry: Registry) =>
  new Hono<{ Bindings: Env }>()
    .route('/blocks', blocksRoutes(registry))
    .route('/layouts', layoutsRoutes(registry))
    .route('/pages', pagesRoutes(registry))
    .route('/settings', settingsRoutes())
    .route('/slots', slotsRoutes(registry))
