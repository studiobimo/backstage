import type { Context } from 'hono'

import { schemaNodeOf } from '../blocks.ts'
import {
  entryLabelsOf,
  type AdminRegistry,
  type Collection,
  type EntryLabels
} from '../collections.ts'
import { ENTRY_WRITE, findEntrySlugs, type EntryWrite } from '../db/entries.ts'
import {
  clearPublishedSlugs,
  readPublishedEntrySlugs,
  recordPublishedSlugs,
  resolveEntrySlugs,
  slugsClash,
  writeEntrySlugs
} from '../db/entry-slugs.ts'
import type { CollectionRoute } from '../entry-pages.ts'
import type { Entry } from '../entries.ts'
import type { EntrySnapshot } from '../entry-publishing.ts'
import { buildEntrySnapshots, type EntrySlugs } from '../entry-snapshot-build.ts'
import { API_ERROR } from '../errors.ts'
import { resolveLocaleConfig } from '../locales.ts'
import type { PublishMediaRow, PublishProblem } from '../publishing.ts'
import type { TranslatedNode } from '../translations.ts'

import type { AccessEnv } from './auth.ts'
import { respondWithError } from './respond.ts'
import {
  entrySnapshotsOf,
  rebuildPublishedIndex,
  removeSnapshotFamily,
  writeSnapshotFamily
} from './snapshots.ts'

type RoutedEntryCollection = Collection & { route: CollectionRoute }

const isRouted = (collection: Collection): collection is RoutedEntryCollection =>
  collection.route !== undefined

export type SlugPlan = { ok: true; slugs: EntrySlugs | null } | { ok: false; response: Response }

export const planEntrySlugs = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  collection: Collection,
  entryId: string,
  { labels, provided }: { labels: EntryLabels; provided?: Readonly<Record<string, string>> }
): Promise<SlugPlan> => {
  if (!isRouted(collection)) return { ok: true, slugs: null }
  const slugs = await resolveEntrySlugs(c.env.DB, collection.name, entryId, {
    config: resolveLocaleConfig(registry),
    labels,
    provided,
    existing: await findEntrySlugs(c.env.DB, collection, entryId)
  })
  return (await slugsClash(c.env.DB, collection.name, entryId, slugs))
    ? { ok: false, response: respondWithError(c, API_ERROR.slugTaken) }
    : { ok: true, slugs }
}

export interface EntryPagePlan {
  problems: PublishProblem[]
  snapshots: EntrySnapshot[]
  slugs: EntrySlugs | null
}

const NO_ENTRY_PAGES: EntryPagePlan = { problems: [], snapshots: [], slugs: null }

export const planEntryPages = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  collection: Collection,
  entry: Entry,
  published: { content: unknown; media: ReadonlyMap<string, PublishMediaRow> },
  publishedAt: number
): Promise<EntryPagePlan> => {
  if (!isRouted(collection)) return NO_ENTRY_PAGES
  const config = resolveLocaleConfig(registry)
  const slugs = await resolveEntrySlugs(c.env.DB, collection.name, entry.id, {
    config,
    labels: entryLabelsOf(collection, published.content, config.defaultLocale),
    existing: entry.slugs
  })
  const built = buildEntrySnapshots(
    collection,
    schemaNodeOf(collection.schema) as TranslatedNode,
    config,
    {
      entry: {
        id: entry.id,
        version: entry.version,
        schemaVersion: entry.schemaVersion,
        content: published.content
      },
      slugs,
      media: published.media,
      publishedAt
    }
  )
  return built.ok
    ? { problems: [], snapshots: built.snapshots, slugs }
    : { problems: built.problems, snapshots: [], slugs }
}

export const planPublishedEntryPages = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  collection: Collection,
  entry: Entry,
  published: { content: unknown; media: ReadonlyMap<string, PublishMediaRow> },
  publishedAt: number
) => {
  if (!isRouted(collection)) return NO_ENTRY_PAGES
  const slugs = await readPublishedEntrySlugs(c.env.DB, collection.name, [entry.id])
  return planEntryPages(
    c,
    registry,
    collection,
    { ...entry, slugs: slugs.get(entry.id) ?? {} },
    published,
    publishedAt
  )
}

export const writeEntryPages = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  collection: Collection,
  entryId: string,
  plan: EntryPagePlan
) => {
  if (!isRouted(collection) || !plan.slugs) return
  await writeEntrySlugs(c.env.DB, collection.name, entryId, plan.slugs)
  await recordPublishedSlugs(c.env.DB, entryId)
  await writeEntrySnapshots(c, registry, collection, entryId, plan)
}

export const writeEntrySnapshots = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  collection: Collection,
  entryId: string,
  plan: EntryPagePlan
) => {
  if (!isRouted(collection)) return
  await writeSnapshotFamily(
    c.env.SITE,
    entrySnapshotsOf(collection.name, collection.route),
    entryId,
    plan.snapshots,
    resolveLocaleConfig(registry).locales
  )
}

const removeEntryPages = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  collection: RoutedEntryCollection,
  entryId: string
) => {
  await clearPublishedSlugs(c.env.DB, entryId)
  return removeSnapshotFamily(
    c.env.SITE,
    entrySnapshotsOf(collection.name, collection.route),
    entryId,
    resolveLocaleConfig(registry).locales
  )
}

export const withoutEntryPages = async (
  c: Context<AccessEnv>,
  registry: AdminRegistry,
  collection: Collection,
  entryId: string,
  write: () => Promise<EntryWrite>
) => {
  if (!isRouted(collection)) return write()
  await removeEntryPages(c, registry, collection, entryId)
  const outcome = await write()
  if (outcome === ENTRY_WRITE.ok) await rebuildPublishedIndex(c, c.env.DB, c.env.SITE)
  return outcome
}

export const refreshEntryIndex = async (c: Context<AccessEnv>, collection: Collection) => {
  if (isRouted(collection)) await rebuildPublishedIndex(c, c.env.DB, c.env.SITE)
}
