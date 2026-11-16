import { z } from 'zod'

import {
  CONTENT_FAILURE,
  validateBlockContent,
  type BlockContentResult,
  type Registry
} from './blocks.ts'
import { collectionsOf, type AdminRegistry } from './collections.ts'
import { entryPathOf, type CollectionRoute } from './entry-pages.ts'
import type { FieldIssue } from './errors.ts'
import { LOCALE, resolveLocaleConfig, type Locale } from './locales.ts'
import { pageBlockSchema, type PageBlock } from './pages.ts'
import { localizeEntryContent, NO_REFERENCES, type ResolvedReferences } from './references.ts'
import {
  isRecord,
  lacksDefaultLocale,
  markedFieldsIn,
  type TranslatedNode
} from './translations.ts'

export const SNAPSHOT = {
  format: 2,
  key: { prefix: 'page', separator: ':' }
} as const

export const snapshotKey = (pageId: string, locale: Locale) =>
  [SNAPSHOT.key.prefix, pageId, locale].join(SNAPSHOT.key.separator)

export const snapshotKeysOf = (pageId: string, locales: readonly Locale[]) =>
  locales.map((locale) => snapshotKey(pageId, locale))

const ROUTE = { key: { prefix: 'route' } } as const

export const routeKey = (locale: Locale, slug: string | null) =>
  [ROUTE.key.prefix, locale, slug ?? ''].join(SNAPSHOT.key.separator)

const recordKeysOf = (pageId: string, locale: Locale, slug: string | null) =>
  [snapshotKey(pageId, locale), routeKey(locale, slug)] as const

export const SNAPSHOT_RECORDS_PER_LOCALE = recordKeysOf(
  '',
  LOCALE.default.defaultLocale,
  null
).length

export const snapshotRecords = (snapshots: readonly Snapshot[]) =>
  snapshots.flatMap((snapshot) => {
    const [snapshotRecordKey, routeRecordKey] = recordKeysOf(
      snapshot.pageId,
      snapshot.locale,
      snapshot.slug
    )
    return [
      { key: snapshotRecordKey, value: JSON.stringify(snapshot) },
      { key: routeRecordKey, value: snapshot.pageId }
    ]
  })

export const routeKeysOf = (snapshots: readonly Pick<Snapshot, 'locale' | 'slug'>[]) =>
  snapshots.map(({ locale, slug }) => routeKey(locale, slug))

export const PUBLISH_PROBLEM = {
  unknownLayout: 'unknown_layout',
  unknownBlock: 'unknown_block',
  invalidContent: 'invalid_content',
  newerSchemaVersion: 'newer_schema_version',
  migrationFailed: 'migration_failed',
  unknownMedia: 'unknown_media',
  missingDefaultLocale: 'missing_default_locale',
  missingSlug: 'missing_slug'
} as const

export type PublishProblemReason = (typeof PUBLISH_PROBLEM)[keyof typeof PUBLISH_PROBLEM]

const publishProblemSchema = z.object({
  reason: z.enum(Object.values(PUBLISH_PROBLEM)),
  blockId: z.string().nullable(),
  slot: z.string().optional(),
  path: z.string().optional()
})
export type PublishProblem = z.infer<typeof publishProblemSchema>

export const snapshotMediaSchema = z.object({
  key: z.string(),
  contentType: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  alt: z.string()
})
export type SnapshotMedia = z.infer<typeof snapshotMediaSchema>

const snapshotEntrySchema = z.object({
  id: z.string(),
  schemaVersion: z.number().int(),
  content: z.json(),
  slug: z.string().optional(),
  href: z.string().optional()
})
type SnapshotEntry = z.infer<typeof snapshotEntrySchema>

export const snapshotSchema = z.object({
  format: z.literal(SNAPSHOT.format),
  pageId: z.string(),
  locale: z.string(),
  isHome: z.boolean(),
  slug: z.string().nullable(),
  title: z.string(),
  layout: z.string(),
  version: z.number().int(),
  publishedAt: z.number().int(),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    socialImageId: z.string().nullable()
  }),
  blocks: z.array(pageBlockSchema),
  entries: z.record(z.string(), z.record(z.string(), snapshotEntrySchema)),
  references: z.record(z.string(), z.record(z.string(), z.array(z.string()))),
  media: z.record(z.string(), snapshotMediaSchema)
})
export type Snapshot = z.infer<typeof snapshotSchema>

type SnapshotUpgrade = (stored: Record<string, unknown>) => Record<string, unknown>

export const SNAPSHOT_UPGRADES: Record<number, SnapshotUpgrade> = {
  1: (stored) => ({ ...stored, entries: {}, references: {} })
}

export const upgradeSnapshot = (
  stored: unknown,
  upgrades: Readonly<Record<number, SnapshotUpgrade>> = SNAPSHOT_UPGRADES
) => {
  if (!isRecord(stored) || typeof stored.format !== 'number') return stored
  const upgrade = upgrades[stored.format]
  return upgrade ? { ...upgrade(stored), format: SNAPSHOT.format } : stored
}

export const readableSnapshotSchema = z.preprocess(
  (stored) => upgradeSnapshot(stored),
  snapshotSchema
)

export const publishPageSchema = z.object({ expectedVersion: z.number().int().min(1) })

export interface PublishLocaleRow {
  locale: string
  slug: string | null
  title: string
  seoTitle: string
  description: string
  socialImageId: string | null
}

export interface PublishMediaRow {
  id: string
  r2Key: string
  contentType: string
  width: number
  height: number
  decorative: boolean
  alt: Record<string, string>
}

export interface PublishDraft {
  page: { id: string; isHome: boolean; layout: string; version: number }
  locales: PublishLocaleRow[]
  blocks: PageBlock[]
}

type Checked<T> = { ok: true; value: T } | { ok: false; problems: PublishProblem[] }

export interface ProblemLocation {
  blockId?: string | null
  slot?: string
  path?: string
}

export const problemOf = (
  reason: PublishProblemReason,
  { blockId = null, slot, path }: ProblemLocation = {}
): PublishProblem => ({
  reason,
  blockId,
  ...(slot === undefined ? {} : { slot }),
  ...(path === undefined ? {} : { path })
})

const FAILURE_REASON = {
  [CONTENT_FAILURE.invalid]: PUBLISH_PROBLEM.invalidContent,
  [CONTENT_FAILURE.newerVersion]: PUBLISH_PROBLEM.newerSchemaVersion,
  [CONTENT_FAILURE.migrationFailed]: PUBLISH_PROBLEM.migrationFailed
} as const

const issuePathOf = (segments: FieldIssue['path']) =>
  segments.reduce<string>(
    (path, segment) =>
      typeof segment === 'number' ? `${path}[${segment}]` : path ? `${path}.${segment}` : segment,
    ''
  )

export const failureProblems = (
  result: Extract<BlockContentResult, { ok: false }>,
  location: ProblemLocation
): PublishProblem[] => {
  const paths = [...new Set(result.issues.map(({ path }) => issuePathOf(path)))]
  return paths.map((path) =>
    problemOf(FAILURE_REASON[result.failure], { ...location, ...(path ? { path } : {}) })
  )
}

const checkBlock = (registry: Registry, block: PageBlock): Checked<PageBlock> => {
  const definition = registry.get(block.block)
  if (!definition || registry.isSlotBlock(block.block)) {
    return { ok: false, problems: [problemOf(PUBLISH_PROBLEM.unknownBlock, { blockId: block.id })] }
  }
  const result = validateBlockContent(definition, block.schemaVersion, block.content)
  if (!result.ok) return { ok: false, problems: failureProblems(result, { blockId: block.id }) }
  return {
    ok: true,
    value: {
      ...block,
      schemaVersion: result.schemaVersion,
      content: result.content as PageBlock['content']
    }
  }
}

export const checkBlocks = (registry: Registry, blocks: readonly PageBlock[]) => {
  const checked = blocks.map((block) => checkBlock(registry, block))
  return {
    blocks: checked.flatMap((entry) => (entry.ok ? [entry.value] : [])),
    problems: checked.flatMap((entry) => (entry.ok ? [] : entry.problems))
  }
}

export const mediaIdsIn = (node: TranslatedNode, value: unknown): string[] =>
  markedFieldsIn(node, value, 'image').flatMap(({ value: image }) =>
    isRecord(image) && typeof image.id === 'string' ? [image.id] : []
  )

const missingDefaultLocalePathsIn = (
  node: TranslatedNode,
  value: unknown,
  defaultLocale: Locale
): string[] =>
  markedFieldsIn(node, value, 'localized').flatMap(({ path, value: entry, required }) =>
    required && lacksDefaultLocale(entry, defaultLocale) ? [path] : []
  )

const ANY_NODE: TranslatedNode = true

const collectionNodeOf = (registry: AdminRegistry, collection: string): TranslatedNode =>
  registry.collectionJsonSchema?.(collection) ?? ANY_NODE

const resolvedEntriesOf = ({ entries }: ResolvedReferences) =>
  Object.entries(entries).flatMap(([collection, byId]) =>
    Object.values(byId).map((entry) => ({ collection, entry }))
  )

export const referencedMediaIds = (
  registry: AdminRegistry,
  blocks: readonly PageBlock[],
  locales: readonly PublishLocaleRow[],
  resolved: ResolvedReferences = NO_REFERENCES
) => [
  ...new Set([
    ...blocks.flatMap(({ block, content }) => mediaIdsIn(registry.jsonSchema(block), content)),
    ...resolvedEntriesOf(resolved).flatMap(({ collection, entry }) =>
      mediaIdsIn(collectionNodeOf(registry, collection), entry.content)
    ),
    ...locales.flatMap(({ socialImageId }) => socialImageId ?? [])
  ])
]

const snapshotMediaOf = (row: PublishMediaRow, locale: Locale): SnapshotMedia => ({
  key: row.r2Key,
  contentType: row.contentType,
  width: row.width,
  height: row.height,
  alt: row.decorative ? '' : (row.alt[locale] ?? '')
})

export const mediaFor = (
  ids: readonly string[],
  media: ReadonlyMap<string, PublishMediaRow>,
  locale: Locale
) =>
  Object.fromEntries(
    ids.flatMap((id) => {
      const row = media.get(id)
      return row ? [[id, snapshotMediaOf(row, locale)]] : []
    })
  )

export const contentProblems = (
  node: TranslatedNode,
  content: unknown,
  media: ReadonlyMap<string, unknown>,
  location: ProblemLocation,
  defaultLocale: Locale
): PublishProblem[] => [
  ...(mediaIdsIn(node, content).some((mediaId) => !media.has(mediaId))
    ? [problemOf(PUBLISH_PROBLEM.unknownMedia, location)]
    : []),
  ...missingDefaultLocalePathsIn(node, content, defaultLocale).map((path) =>
    problemOf(PUBLISH_PROBLEM.missingDefaultLocale, { ...location, path })
  )
]

const referenceProblems = (
  registry: AdminRegistry,
  draft: PublishDraft,
  media: ReadonlyMap<string, PublishMediaRow>
): PublishProblem[] => [
  ...(registry.hasLayout(draft.page.layout) ? [] : [problemOf(PUBLISH_PROBLEM.unknownLayout)]),
  ...draft.locales.flatMap(({ slug }) =>
    draft.page.isHome || slug ? [] : [problemOf(PUBLISH_PROBLEM.missingSlug)]
  ),
  ...draft.blocks.flatMap(({ id, block, content }) =>
    contentProblems(
      registry.jsonSchema(block),
      content,
      media,
      { blockId: id },
      resolveLocaleConfig(registry).defaultLocale
    )
  ),
  ...(draft.locales.some(({ socialImageId }) => socialImageId && !media.has(socialImageId))
    ? [problemOf(PUBLISH_PROBLEM.unknownMedia)]
    : [])
]

export type SnapshotBuild =
  { ok: true; snapshots: Snapshot[] } | { ok: false; problems: PublishProblem[] }

export const buildSnapshots = (
  registry: AdminRegistry,
  draft: PublishDraft,
  media: ReadonlyMap<string, PublishMediaRow>,
  publishedAt: number,
  resolved: ResolvedReferences = NO_REFERENCES
): SnapshotBuild => {
  const checked = checkBlocks(registry, draft.blocks)
  const valid: PublishDraft = { ...draft, blocks: checked.blocks }
  const problems = [...checked.problems, ...referenceProblems(registry, valid, media)]
  if (problems.length > 0) return { ok: false, problems }
  const blockMediaIds = referencedMediaIds(registry, valid.blocks, [], resolved)
  const { locales, defaultLocale } = resolveLocaleConfig(registry)
  return {
    ok: true,
    snapshots: locales.map((locale) =>
      snapshotOf(valid, locale, blockMediaIds, media, publishedAt, {
        references: resolved.references,
        entries: entriesForLocale(registry, resolved, locale, defaultLocale)
      })
    )
  }
}

const addressOf = (
  route: CollectionRoute | undefined,
  slug: string | undefined,
  { locale, defaultLocale }: { locale: Locale; defaultLocale: Locale }
) => (route && slug ? { slug, href: entryPathOf(route, slug, locale, defaultLocale) } : {})

export const entriesForLocale = (
  registry: AdminRegistry,
  { entries }: ResolvedReferences,
  locale: Locale,
  defaultLocale: Locale
): Snapshot['entries'] =>
  Object.fromEntries(
    Object.entries(entries).map(([collection, byId]) => [
      collection,
      Object.fromEntries(
        Object.entries(byId).map(([id, { schemaVersion, content, slugs }]) => [
          id,
          {
            id,
            schemaVersion,
            content: localizeEntryContent(
              collectionNodeOf(registry, collection),
              content,
              locale,
              defaultLocale
            ) as SnapshotEntry['content'],
            ...addressOf(collectionsOf(registry).get(collection)?.route, slugs?.[locale], {
              locale,
              defaultLocale
            })
          }
        ])
      )
    ])
  )

const snapshotOf = (
  draft: PublishDraft,
  locale: Locale,
  mediaIds: readonly string[],
  media: ReadonlyMap<string, PublishMediaRow>,
  publishedAt: number,
  references: Pick<Snapshot, 'entries' | 'references'>
): Snapshot => {
  const row = draft.locales.find((candidate) => candidate.locale === locale)
  const ids = [...mediaIds, ...(row?.socialImageId ? [row.socialImageId] : [])]
  return {
    format: SNAPSHOT.format,
    pageId: draft.page.id,
    locale,
    isHome: draft.page.isHome,
    slug: row?.slug ?? null,
    title: row?.title ?? '',
    layout: draft.page.layout,
    version: draft.page.version,
    publishedAt,
    seo: {
      title: row?.seoTitle ?? '',
      description: row?.description ?? '',
      socialImageId: row?.socialImageId ?? null
    },
    blocks: draft.blocks,
    ...references,
    media: mediaFor(ids, media, locale)
  }
}

export const publishProblemsResponseSchema = z.object({
  error: z.string(),
  code: z.literal('unpublishable'),
  problems: z.array(publishProblemSchema)
})
