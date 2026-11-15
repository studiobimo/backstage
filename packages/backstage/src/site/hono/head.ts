import type { Snapshot, SnapshotMedia } from '../../publishing.ts'
import type { SiteSnapshot } from '../../site-publishing.ts'

const DOCUMENT_TITLE = { separator: ' | ' } as const

export const documentTitleOf = (snapshot: Snapshot, site: SiteSnapshot | null) => {
  const pageTitle = snapshot.seo.title || snapshot.title
  return !site?.siteName || site.siteName === pageTitle
    ? pageTitle
    : `${pageTitle}${DOCUMENT_TITLE.separator}${site.siteName}`
}

export const descriptionOf = (snapshot: Snapshot, site: SiteSnapshot | null) =>
  snapshot.seo.description || site?.seo.description || ''

interface SocialImageOwner {
  seo: { socialImageId: string | null }
  media: Record<string, SnapshotMedia>
}

const mediaOf = (owner: SocialImageOwner | null): SnapshotMedia | null =>
  (owner?.seo.socialImageId && owner.media[owner.seo.socialImageId]) || null

export const socialImageOf = (snapshot: Snapshot, site: SiteSnapshot | null) =>
  mediaOf(snapshot) ?? mediaOf(site)
