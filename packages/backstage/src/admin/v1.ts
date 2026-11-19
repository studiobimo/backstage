import type { AdminRegistry } from '../collections.ts'
import { Hono } from 'hono'

import { blocksRoutes } from './blocks.ts'
import { collectionsRoutes } from './collections.ts'
import { configRoutes } from './config.ts'
import { formsRoutes } from './forms.ts'
import { entryPublishRoutes } from './entry-publish.ts'
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
import { usersRoutes } from './users.ts'
import { bumpSiteVersionOnPublish } from './site-version.ts'
import type { AdminEnv } from './env.ts'

export const v1Routes = (registry: AdminRegistry) =>
  new Hono<{ Bindings: AdminEnv }>()
    .use(bumpSiteVersionOnPublish)
    .route('/blocks', blocksRoutes(registry))
    .route('/collections', collectionsRoutes(registry))
    .route('/collections', entryPublishRoutes(registry))
    .route('/config', configRoutes(registry))
    .route('/forms', formsRoutes(registry))
    .route('/layouts', layoutsRoutes(registry))
    .route('/media', mediaRoutes(registry))
    .route('/republish', republishRoutes(registry))
    .route('/pages', pagesRoutes(registry))
    .route('/pages', publishRoutes(registry))
    .route('/pages', previewRoutes(registry))
    .route('/settings', settingsRoutes(registry))
    .route('/site-origin', siteOriginRoutes())
    .route('/site', sitePublishRoutes(registry))
    .route('/slots', slotsRoutes(registry))
    .route('/users', usersRoutes())
