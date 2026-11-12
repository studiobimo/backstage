import type { Registry } from '../index.ts'
import { Hono } from 'hono'

import { blocksRoutes } from './blocks.ts'
import { layoutsRoutes } from './layouts.ts'
import { mediaRoutes } from './media.ts'
import { pagesRoutes } from './pages.ts'
import { publishRoutes } from './publish.ts'
import { settingsRoutes } from './settings.ts'
import { sitePublishRoutes } from './site-publish.ts'
import { siteOriginRoutes } from './site-origin.ts'
import { slotsRoutes } from './slots.ts'
import type { AdminEnv } from './env.ts'

export const v1Routes = (registry: Registry) =>
  new Hono<{ Bindings: AdminEnv }>()
    .route('/blocks', blocksRoutes(registry))
    .route('/layouts', layoutsRoutes(registry))
    .route('/media', mediaRoutes())
    .route('/pages', pagesRoutes(registry))
    .route('/pages', publishRoutes(registry))
    .route('/settings', settingsRoutes())
    .route('/site-origin', siteOriginRoutes())
    .route('/site', sitePublishRoutes(registry))
    .route('/slots', slotsRoutes(registry))
