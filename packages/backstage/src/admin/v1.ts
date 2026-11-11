import type { Registry } from '../index.ts'
import { Hono } from 'hono'

import { blocksRoutes } from './blocks.ts'
import { layoutsRoutes } from './layouts.ts'
import { mediaRoutes } from './media.ts'
import { pagesRoutes } from './pages.ts'
import { publishRoutes } from './publish.ts'
import { settingsRoutes } from './settings.ts'
import { siteOriginRoutes } from './site-origin.ts'
import { slotsRoutes } from './slots.ts'

export const v1Routes = (registry: Registry) =>
  new Hono<{ Bindings: Env }>()
    .route('/blocks', blocksRoutes(registry))
    .route('/layouts', layoutsRoutes(registry))
    .route('/media', mediaRoutes())
    .route('/pages', pagesRoutes(registry))
    .route('/pages', publishRoutes(registry))
    .route('/settings', settingsRoutes())
    .route('/site-origin', siteOriginRoutes())
    .route('/slots', slotsRoutes(registry))
