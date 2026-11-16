import { z } from 'zod'

import { validateBlockContent, type Registry } from './blocks.ts'
import { resolveLocaleConfig, type Locale } from './locales.ts'
import {
  contentProblems,
  failureProblems,
  NO_PAGES,
  pageLinkProblems,
  mediaFor,
  mediaIdsIn,
  problemOf,
  PUBLISH_PROBLEM,
  snapshotMediaSchema,
  type PublishMediaRow,
  type PublishProblem
} from './publishing.ts'
import { pageLinkIdsIn, resolvePageLinks, type PageAddresses } from './page-links.ts'
import { siteSettingsJsonSchema, type SiteSettings } from './settings.ts'
import { siteBlockSchema, type SiteBlock } from './slots.ts'

export const SITE_SNAPSHOT = {
  format: 1,
  key: { prefix: 'site', separator: ':' }
} as const

export const siteSnapshotKey = (locale: Locale) =>
  [SITE_SNAPSHOT.key.prefix, locale].join(SITE_SNAPSHOT.key.separator)

export const siteSnapshotSchema = z.object({
  format: z.literal(SITE_SNAPSHOT.format),
  locale: z.string(),
  publishedAt: z.number().int(),
  siteName: z.string(),
  seo: z.object({
    description: z.string(),
    socialImageId: z.string().nullable()
  }),
  slots: z.record(z.string(), siteBlockSchema),
  media: z.record(z.string(), snapshotMediaSchema)
})
export type SiteSnapshot = z.infer<typeof siteSnapshotSchema>

const sitePublicationSchema = z.object({
  publishedAt: z.number().int().nullable(),
  publishedBy: z.string().nullable(),
  hasUnpublishedChanges: z.boolean()
})
export type SitePublication = z.infer<typeof sitePublicationSchema>

export const sitePublicationResponseSchema = z.object({ publication: sitePublicationSchema })

export interface SiteVersions {
  settings: number
  slots: Record<string, number>
}

export const sameSiteVersions = (a: SiteVersions, b: SiteVersions) =>
  a.settings === b.settings &&
  Object.keys({ ...a.slots, ...b.slots }).every((slot) => a.slots[slot] === b.slots[slot])

export interface SiteDraft {
  settings: SiteSettings
  blocks: ReadonlyMap<string, SiteBlock>
}

export type SiteSnapshotBuild =
  { ok: true; snapshots: SiteSnapshot[] } | { ok: false; problems: PublishProblem[] }

type CheckedSlot = { ok: true; value: SiteBlock } | { ok: false; problems: PublishProblem[] }

const checkSlotBlock = (registry: Registry, slot: string, stored: SiteBlock): CheckedSlot => {
  const definition = registry.get(stored.block)
  if (!definition || !registry.slots.get(slot)?.includes(definition.name)) {
    return { ok: false, problems: [problemOf(PUBLISH_PROBLEM.unknownBlock, { slot })] }
  }
  const result = validateBlockContent(definition, stored.schemaVersion, stored.content)
  if (!result.ok) return { ok: false, problems: failureProblems(result, { slot }) }
  return {
    ok: true,
    value: {
      block: definition.name,
      schemaVersion: result.schemaVersion,
      content: result.content as SiteBlock['content']
    }
  }
}

const slotsToPublish = (registry: Registry, draft: SiteDraft) =>
  [...registry.slots.keys()].flatMap((slot) => {
    const stored = draft.blocks.get(slot)
    return stored ? [{ slot, checked: checkSlotBlock(registry, slot, stored) }] : []
  })

export const siteMediaIds = (registry: Registry, draft: SiteDraft) => [
  ...new Set([
    ...mediaIdsIn(siteSettingsJsonSchema(), draft.settings),
    ...slotsToPublish(registry, draft).flatMap(({ checked }) =>
      checked.ok ? mediaIdsIn(registry.jsonSchema(checked.value.block), checked.value.content) : []
    )
  ])
]

export const siteLinkedPageIds = (registry: Registry, draft: SiteDraft) => [
  ...new Set(
    slotsToPublish(registry, draft).flatMap(({ checked }) =>
      checked.ok
        ? pageLinkIdsIn(registry.jsonSchema(checked.value.block), checked.value.content)
        : []
    )
  )
]

const slotProblems = (
  registry: Registry,
  slot: string,
  checked: CheckedSlot,
  media: ReadonlyMap<string, PublishMediaRow>,
  addresses: PageAddresses
) => {
  if (!checked.ok) return checked.problems
  const node = registry.jsonSchema(checked.value.block)
  const { defaultLocale, locales } = resolveLocaleConfig(registry)
  return [
    ...contentProblems(node, checked.value.content, media, { slot }, defaultLocale),
    ...pageLinkProblems(node, checked.value.content, addresses, locales, { slot })
  ]
}

const slotsFor = (
  registry: Registry,
  published: Record<string, SiteBlock>,
  locale: Locale,
  addresses: PageAddresses
) =>
  Object.fromEntries(
    Object.entries(published).map(([slot, stored]) => [
      slot,
      {
        ...stored,
        content: resolvePageLinks(
          registry.jsonSchema(stored.block),
          stored.content,
          locale,
          addresses,
          resolveLocaleConfig(registry)
        ) as SiteBlock['content']
      }
    ])
  )

export const buildSiteSnapshots = (
  registry: Registry,
  draft: SiteDraft,
  media: ReadonlyMap<string, PublishMediaRow>,
  publishedAt: number,
  addresses: PageAddresses = NO_PAGES
): SiteSnapshotBuild => {
  const slots = slotsToPublish(registry, draft)
  const problems = [
    ...contentProblems(
      siteSettingsJsonSchema(),
      draft.settings,
      media,
      {},
      resolveLocaleConfig(registry).defaultLocale
    ),
    ...slots.flatMap(({ slot, checked }) => slotProblems(registry, slot, checked, media, addresses))
  ]
  if (problems.length > 0) return { ok: false, problems }
  const published = Object.fromEntries(
    slots.flatMap(({ slot, checked }) => (checked.ok ? [[slot, checked.value]] : []))
  )
  const mediaIds = siteMediaIds(registry, draft)
  const { siteName, defaultDescription, defaultSocialImage } = draft.settings
  const { locales, defaultLocale } = resolveLocaleConfig(registry)
  return {
    ok: true,
    snapshots: locales.map((locale) => ({
      format: SITE_SNAPSHOT.format,
      locale,
      publishedAt,
      siteName: siteName[locale] || siteName[defaultLocale] || '',
      seo: {
        description: defaultDescription?.[locale] ?? '',
        socialImageId: defaultSocialImage?.id ?? null
      },
      slots: slotsFor(registry, published, locale, addresses),
      media: mediaFor(mediaIds, media, locale)
    }))
  }
}

export const siteSnapshotRecords = (snapshots: readonly SiteSnapshot[]) =>
  snapshots.map((snapshot) => ({
    key: siteSnapshotKey(snapshot.locale),
    value: JSON.stringify(snapshot)
  }))
