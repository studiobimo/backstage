import { eq } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import type { Registry } from '../blocks.ts'
import type { PublishProblem } from '../publishing.ts'
import {
  buildSiteSnapshots,
  sameSiteVersions,
  siteLinkedPageIds,
  siteMediaIds,
  type SiteDraft,
  type SitePublication,
  type SiteSnapshot,
  type SiteVersions
} from '../site-publishing.ts'
import { replacePageLinkRefs } from './page-link-references.ts'
import { readMedia, readPageAddresses } from './publishing.ts'
import { siteBlocks, sitePublication, siteSettings, users } from './schema.ts'
import { readSiteBlocks } from './site-blocks.ts'
import { readVersionedSiteSettings } from './settings.ts'
import { ROW_VERSION } from './versioned-row.ts'

const PUBLICATION_ROW_ID = 'site'
const SETTINGS_ROW_ID = 'site'

export const SITE_PUBLISH_PLAN = { ready: 'ready', invalid: 'invalid' } as const

export type SitePublishPlan =
  | {
      status: typeof SITE_PUBLISH_PLAN.ready
      snapshots: SiteSnapshot[]
      versions: SiteVersions
      linkedPageIds: string[]
    }
  | { status: typeof SITE_PUBLISH_PLAN.invalid; problems: PublishProblem[] }

const readSiteDraft = async (
  d1: AnyD1Database
): Promise<{ draft: SiteDraft; versions: SiteVersions }> => {
  const [{ settings, version }, blocks] = await Promise.all([
    readVersionedSiteSettings(d1),
    readSiteBlocks(d1)
  ])
  return {
    draft: { settings, blocks },
    versions: {
      settings: version,
      slots: Object.fromEntries([...blocks].map(([slot, block]) => [slot, block.version]))
    }
  }
}

export const planSitePublish = async (
  d1: AnyD1Database,
  registry: Registry,
  publishedAt: number
): Promise<SitePublishPlan> => {
  const { draft, versions } = await readSiteDraft(d1)
  const mediaRows = await readMedia(d1, siteMediaIds(registry, draft))
  const linkedPageIds = siteLinkedPageIds(registry, draft)
  const addresses = await readPageAddresses(d1, linkedPageIds)
  const built = buildSiteSnapshots(registry, draft, mediaRows, publishedAt, addresses)
  if (!built.ok) return { status: SITE_PUBLISH_PLAN.invalid, problems: built.problems }
  return {
    status: SITE_PUBLISH_PLAN.ready,
    snapshots: built.snapshots,
    versions,
    linkedPageIds
  }
}

export const recordSitePublished = async (
  d1: AnyD1Database,
  editorId: string,
  publishedAt: number,
  versions: SiteVersions,
  linkedPageIds: readonly string[]
) => {
  const values = { id: PUBLICATION_ROW_ID, publishedAt, publishedBy: editorId, versions }
  await drizzle(d1)
    .insert(sitePublication)
    .values(values)
    .onConflictDoUpdate({ target: sitePublication.id, set: values })
  await replacePageLinkRefs(d1, null, linkedPageIds)
}

const readCurrentVersions = async (d1: AnyD1Database): Promise<SiteVersions> => {
  const db = drizzle(d1)
  const [[settings], blocks] = await Promise.all([
    db
      .select({ version: siteSettings.version })
      .from(siteSettings)
      .where(eq(siteSettings.id, SETTINGS_ROW_ID)),
    db.select({ slot: siteBlocks.slot, version: siteBlocks.version }).from(siteBlocks)
  ])
  return {
    settings: settings?.version ?? ROW_VERSION.absent,
    slots: Object.fromEntries(blocks.map(({ slot, version }) => [slot, version]))
  }
}

export const readSitePublication = async (d1: AnyD1Database): Promise<SitePublication> => {
  const [[row], current] = await Promise.all([
    drizzle(d1)
      .select({
        publishedAt: sitePublication.publishedAt,
        versions: sitePublication.versions,
        publisherName: users.name,
        publisherEmail: users.email
      })
      .from(sitePublication)
      .leftJoin(users, eq(users.id, sitePublication.publishedBy))
      .where(eq(sitePublication.id, PUBLICATION_ROW_ID)),
    readCurrentVersions(d1)
  ])
  return {
    publishedAt: row?.publishedAt ?? null,
    publishedBy: row ? row.publisherName || row.publisherEmail || null : null,
    hasUnpublishedChanges: !row || !sameSiteVersions(row.versions, current)
  }
}
