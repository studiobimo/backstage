import { entryLabelsOf, type Collection } from './collections.ts'
import { ENTRY_SNAPSHOT, type EntrySnapshot } from './entry-publishing.ts'
import type { Locale } from './locales.ts'
import {
  mediaFor,
  mediaIdsIn,
  problemOf,
  PUBLISH_PROBLEM,
  type PublishMediaRow,
  type PublishProblem
} from './publishing.ts'
import { localizeEntryContent } from './references.ts'
import type { TranslatedNode } from './translations.ts'

interface PublishableEntry {
  id: string
  version: number
  schemaVersion: number
  content: unknown
}

export type EntrySlugs = Readonly<Record<string, string | null>>

export type EntrySnapshotBuild =
  { ok: true; snapshots: EntrySnapshot[] } | { ok: false; problems: PublishProblem[] }

interface EntryPublication {
  entry: PublishableEntry
  slugs: EntrySlugs
  media: ReadonlyMap<string, PublishMediaRow>
  publishedAt: number
}

export const buildEntrySnapshots = (
  collection: Collection,
  node: TranslatedNode,
  config: { locales: readonly Locale[]; defaultLocale: Locale },
  { entry, slugs, media, publishedAt }: EntryPublication
): EntrySnapshotBuild => {
  const missing = config.locales.filter((locale) => !slugs[locale])
  if (missing.length > 0) {
    return { ok: false, problems: [problemOf(PUBLISH_PROBLEM.missingSlug)] }
  }
  const labels = entryLabelsOf(collection, entry.content, config.defaultLocale)
  const mediaIds = mediaIdsIn(node, entry.content)
  return {
    ok: true,
    snapshots: config.locales.map((locale) => ({
      format: ENTRY_SNAPSHOT.format,
      collection: collection.name,
      entryId: entry.id,
      locale,
      slug: slugs[locale] ?? '',
      title: labels[locale] ?? labels[config.defaultLocale] ?? '',
      schemaVersion: entry.schemaVersion,
      version: entry.version,
      publishedAt,
      content: localizeEntryContent(
        node,
        entry.content,
        locale,
        config.defaultLocale
      ) as EntrySnapshot['content'],
      media: mediaFor(mediaIds, media, locale)
    }))
  }
}
