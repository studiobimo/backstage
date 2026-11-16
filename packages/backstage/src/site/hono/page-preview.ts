import { Hono } from 'hono'

import { API_ERROR } from '../../errors.ts'
import { PAGE_PREVIEW } from '../../page-preview.ts'
import type { Snapshot } from '../../publishing.ts'
import { findPagePreview, findSiteSnapshot } from '../store.ts'
import type { SiteEnv } from '../index.ts'
import { renderPage, type DocumentContext } from './document.tsx'
import { siteOriginOf } from './origin.ts'
import { PREVIEW_HEADERS } from './preview.ts'
import { respondWithError } from './respond.ts'

const snapshotFor = (
  snapshots: readonly Snapshot[],
  locale: string | undefined,
  fallback: string
) =>
  snapshots.find((snapshot) => snapshot.locale === locale) ??
  snapshots.find((snapshot) => snapshot.locale === fallback)

export const pagePreviewRoutes = (context: DocumentContext) =>
  new Hono<{ Bindings: SiteEnv }>().get(`${PAGE_PREVIEW.path}/:token`, async (c) => {
    const token = c.req.param('token')
    const preview = await findPagePreview(c.env.SITE, token)
    const snapshot =
      preview &&
      snapshotFor(
        preview.snapshots,
        c.req.query(PAGE_PREVIEW.localeParam),
        context.locales.defaultLocale
      )
    if (!snapshot) return respondWithError(c, API_ERROR.notFound, PREVIEW_HEADERS)
    return renderPage(
      {
        ...context,
        snapshot,
        translations: preview.snapshots.filter(({ locale }) => locale !== snapshot.locale),
        site: await findSiteSnapshot(c.env.SITE, snapshot.locale),
        siteOrigin: siteOriginOf(c.env),
        preview: { token }
      },
      PREVIEW_HEADERS
    )
  })
