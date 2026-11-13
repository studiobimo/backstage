import type { Snapshot } from '../../publishing.ts'
import {
  alternateLinks,
  canonicalUrl,
  EMPTY_PUBLISHED_INDEX,
  upsertIntoIndex,
  type AlternateLink
} from '../../seo.ts'

const SITE_URL = {
  protocols: ['http:', 'https:'],
  invalidMessage: 'SITE_URL must be set to the absolute canonical URL of the site'
} as const

export const siteOriginOf = (env: { SITE_URL: string }) => {
  const configured = URL.canParse(env.SITE_URL) ? new URL(env.SITE_URL) : null
  if (!configured || !SITE_URL.protocols.some((protocol) => protocol === configured.protocol)) {
    throw new Error(SITE_URL.invalidMessage)
  }
  return configured.origin
}

export const atSiteOrigin = (request: Request, siteOrigin: string) =>
  new Request(new URL(new URL(request.url).pathname, siteOrigin))

export interface PageLinks {
  canonical: string
  alternates: AlternateLink[]
}

export const linksOf = (
  siteOrigin: string,
  snapshot: Snapshot,
  translations: readonly Snapshot[]
): PageLinks => {
  const [page] = upsertIntoIndex(EMPTY_PUBLISHED_INDEX, [snapshot, ...translations]).pages
  return {
    canonical: canonicalUrl(siteOrigin, page!, snapshot.locale),
    alternates: alternateLinks(siteOrigin, page!)
  }
}
