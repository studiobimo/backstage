import type { Registry } from '@studiobimo/backstage'
import { Hono } from 'hono'

import { blocksRoutes } from './blocks'
import { layoutsRoutes } from './layouts'
import { mediaRoutes } from './media'
import { pagesRoutes } from './pages'
import { publishRoutes } from './publish'
import { settingsRoutes } from './settings'
import { slotsRoutes } from './slots'

export const v1Routes = (registry: Registry) =>
  new Hono<{ Bindings: Env }>()
    .route('/blocks', blocksRoutes(registry))
    .route('/layouts', layoutsRoutes(registry))
    .route('/media', mediaRoutes())
    .route('/pages', pagesRoutes(registry))
    .route('/pages', publishRoutes(registry))
    .route('/settings', settingsRoutes())
    .route('/slots', slotsRoutes(registry))
