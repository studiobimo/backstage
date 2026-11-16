import type { Registry } from '../blocks.ts'
import { Hono } from 'hono'

import { blocksRoutes } from './blocks.ts'
import { configRoutes } from './config.ts'
import { layoutsRoutes } from './layouts.ts'
import { mediaRoutes } from './media.ts'
import { republishRoutes } from './republish.ts'
import { pagesRoutes } from './pages.ts'
import { previewRoutes } from './preview.ts'
import { publishRoutes } from './publish.ts'
import { settingsRoutes } from './settings.ts'
import { sitePublishRoutes } from './site-publish.ts'
import { siteOriginRoutes } from './site-origin.ts'
import { slotsRoutes } from './slots.ts'
import type { AdminEnv } from './env.ts'

export const v1Routes = (registry: Registry) =>
  new Hono<{ Bindings: AdminEnv }>()
    .route('/blocks', blocksRoutes(registry))
    .route('/config', configRoutes(registry))
    .route('/layouts', layoutsRoutes(registry))
    .route('/media', mediaRoutes(registry))
    .route('/republish', republishRoutes(registry))
    .route('/pages', pagesRoutes(registry))
    .route('/pages', publishRoutes(registry))
    .route('/pages', previewRoutes(registry))
    .route('/settings', settingsRoutes())
    .route('/site-origin', siteOriginRoutes())
    .route('/site', sitePublishRoutes(registry))
    .route('/slots', slotsRoutes(registry))
