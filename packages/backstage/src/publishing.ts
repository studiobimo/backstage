import { z } from 'zod'

import { validateBlockContent, type Registry } from './blocks.ts'
import { LOCALES, pageBlockSchema, type Locale, type PageBlock } from './pages.ts'
import type { SiteSettings } from './settings.ts'
import { RICH_TEXT } from './rich-text.ts'
import { isRecord, markedFieldsIn, type TranslatedNode } from './translations.ts'

export const SNAPSHOT = {
  format: 1,
  key: { prefix: 'page', separator: ':' }
} as const

export const snapshotKey = (pageId: string, locale: Locale) =>
  [SNAPSHOT.key.prefix, pageId, locale].join(SNAPSHOT.key.separator)

export const snapshotKeysOf = (pageId: string) =>
  LOCALES.map((locale) => snapshotKey(pageId, locale))

const ROUTE = { key: { prefix: 'route' } } as const

export const routeKey = (locale: Locale, slug: string | null) =>
  [ROUTE.key.prefix, locale, slug ?? ''].join(SNAPSHOT.key.separator)

export const snapshotRecords = (snapshots: readonly Snapshot[]) =>
  snapshots.flatMap((snapshot) => [
    { key: snapshotKey(snapshot.pageId, snapshot.locale), value: JSON.stringify(snapshot) },
    { key: routeKey(snapshot.locale, snapshot.slug), value: snapshot.pageId }
  ])

export const routeKeysOf = (snapshots: readonly Pick<Snapshot, 'locale' | 'slug'>[]) =>
  snapshots.map(({ locale, slug }) => routeKey(locale, slug))

const PUBLISH_PROBLEM = {
  unknownLayout: 'unknown_layout',
  unknownBlock: 'unknown_block',
  invalidContent: 'invalid_content',
  unknownMedia: 'unknown_media',
  unsafeLink: 'unsafe_link',
  missingSlug: 'missing_slug'
} as const

type PublishProblemReason = (typeof PUBLISH_PROBLEM)[keyof typeof PUBLISH_PROBLEM]

const publishProblemSchema = z.object({
  reason: z.enum(Object.values(PUBLISH_PROBLEM)),
  blockId: z.string().nullable(),
  path: z.string().optional()
})
export type PublishProblem = z.infer<typeof publishProblemSchema>

const snapshotMediaSchema = z.object({
  key: z.string(),
  contentType: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  alt: z.string()
})
type SnapshotMedia = z.infer<typeof snapshotMediaSchema>

export const snapshotSchema = z.object({
  format: z.literal(SNAPSHOT.format),
  pageId: z.string(),
  locale: z.enum(LOCALES),
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
  media: z.record(z.string(), snapshotMediaSchema)
})
export type Snapshot = z.infer<typeof snapshotSchema>

export const withSeoDefaults = (
  locales: readonly PublishLocaleRow[],
  settings: SiteSettings
): PublishLocaleRow[] =>
  locales.map((row) => ({
    ...row,
    description: row.description || settings.defaultDescription?.[row.locale] || '',
    socialImageId: row.socialImageId ?? settings.defaultSocialImage?.id ?? null
  }))

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

type Checked<T> = { ok: true; value: T } | { ok: false; problem: PublishProblem }

const rejection = (reason: PublishProblemReason, blockId: string | null = null, path?: string) =>
  ({ ok: false, problem: { reason, blockId, ...(path === undefined ? {} : { path }) } }) as const

const checkBlock = (registry: Registry, block: PageBlock): Checked<PageBlock> => {
  const definition = registry.get(block.block)
  if (!definition || registry.isSlotBlock(block.block)) {
    return rejection(PUBLISH_PROBLEM.unknownBlock, block.id)
  }
  const result = validateBlockContent(definition, block.schemaVersion, block.content)
  if (!result.ok) return rejection(PUBLISH_PROBLEM.invalidContent, block.id)
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
    problems: checked.flatMap((entry) => (entry.ok ? [] : [entry.problem]))
  }
}

const mediaIdsIn = (node: TranslatedNode, value: unknown): string[] =>
  markedFieldsIn(node, value, 'image').flatMap(({ value: image }) =>
    isRecord(image) && typeof image.id === 'string' ? [image.id] : []
  )

const unsafeLinkPathsIn = (node: TranslatedNode, value: unknown): string[] =>
  markedFieldsIn(node, value, 'link').flatMap(({ path, value: link }) =>
    isRecord(link) && typeof link.href === 'string' && !RICH_TEXT.safeHref.test(link.href)
      ? [path]
      : []
  )

export const referencedMediaIds = (
  registry: Registry,
  blocks: readonly PageBlock[],
  locales: readonly PublishLocaleRow[]
) => [
  ...new Set([
    ...blocks.flatMap(({ block, content }) => mediaIdsIn(registry.jsonSchema(block), content)),
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

const mediaFor = (
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

const referenceProblems = (
  registry: Registry,
  draft: PublishDraft,
  media: ReadonlyMap<string, PublishMediaRow>
): PublishProblem[] => [
  ...(registry.hasLayout(draft.page.layout)
    ? []
    : [rejection(PUBLISH_PROBLEM.unknownLayout).problem]),
  ...draft.locales.flatMap(({ slug }) =>
    draft.page.isHome || slug ? [] : [rejection(PUBLISH_PROBLEM.missingSlug).problem]
  ),
  ...draft.blocks.flatMap(({ id, block, content }) =>
    mediaIdsIn(registry.jsonSchema(block), content).some((mediaId) => !media.has(mediaId))
      ? [rejection(PUBLISH_PROBLEM.unknownMedia, id).problem]
      : []
  ),
  ...draft.blocks.flatMap(({ id, block, content }) =>
    unsafeLinkPathsIn(registry.jsonSchema(block), content).map(
      (path) => rejection(PUBLISH_PROBLEM.unsafeLink, id, path).problem
    )
  ),
  ...(draft.locales.some(({ socialImageId }) => socialImageId && !media.has(socialImageId))
    ? [rejection(PUBLISH_PROBLEM.unknownMedia).problem]
    : [])
]

export type SnapshotBuild =
  { ok: true; snapshots: Snapshot[] } | { ok: false; problems: PublishProblem[] }

export const buildSnapshots = (
  registry: Registry,
  draft: PublishDraft,
  media: ReadonlyMap<string, PublishMediaRow>,
  publishedAt: number
): SnapshotBuild => {
  const checked = checkBlocks(registry, draft.blocks)
  const valid: PublishDraft = { ...draft, blocks: checked.blocks }
  const problems = [...checked.problems, ...referenceProblems(registry, valid, media)]
  if (problems.length > 0) return { ok: false, problems }
  const blockMediaIds = referencedMediaIds(registry, valid.blocks, [])
  return {
    ok: true,
    snapshots: LOCALES.map((locale) => snapshotOf(valid, locale, blockMediaIds, media, publishedAt))
  }
}

const snapshotOf = (
  draft: PublishDraft,
  locale: Locale,
  mediaIds: readonly string[],
  media: ReadonlyMap<string, PublishMediaRow>,
  publishedAt: number
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
    media: mediaFor(ids, media, locale)
  }
}

export const publishProblemsResponseSchema = z.object({
  error: z.string(),
  code: z.literal('unpublishable'),
  problems: z.array(publishProblemSchema)
})
