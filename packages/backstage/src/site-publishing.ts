import { z } from 'zod'

import { NO_SITE_BRAND, siteBrandSchema, type SiteBrand } from './brand.ts'
import { CONTENT_FAILURE, validateBlockContent } from './blocks.ts'
import type { AdminRegistry } from './collections.ts'
import { fieldIssuesOf } from './errors.ts'
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
  brand: siteBrandSchema.default(NO_SITE_BRAND),
  settings: z.record(z.string(), z.unknown()).nullable().optional(),
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
  registrySettings?: number
  slots: Record<string, number>
}

export const sameSiteVersions = (a: SiteVersions, b: SiteVersions) =>
  a.settings === b.settings &&
  (a.registrySettings ?? 0) === (b.registrySettings ?? 0) &&
  Object.keys({ ...a.slots, ...b.slots }).every((slot) => a.slots[slot] === b.slots[slot])

export interface SiteDraft {
  settings: SiteSettings
  registrySettings: Record<string, unknown> | null
  blocks: ReadonlyMap<string, SiteBlock>
}

export type SiteSnapshotBuild =
  { ok: true; snapshots: SiteSnapshot[] } | { ok: false; problems: PublishProblem[] }

type CheckedSlot = { ok: true; value: SiteBlock } | { ok: false; problems: PublishProblem[] }

const checkSlotBlock = (registry: AdminRegistry, slot: string, stored: SiteBlock): CheckedSlot => {
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

const brandOf = ({ logo, themeColor }: SiteSettings): SiteBrand => ({
  logo: logo ? { id: logo.id, alt: logo.alt } : null,
  themeColor: themeColor ?? null
})

const REGISTRY_SETTINGS_PROBLEM_SLOT = '_settings'
const REGISTRY_LOCATION = { slot: REGISTRY_SETTINGS_PROBLEM_SLOT }

type CheckedRegistrySettings =
  { ok: true; value: Record<string, unknown> | null } | { ok: false; problems: PublishProblem[] }

const checkRegistrySettings = (
  registry: AdminRegistry,
  draft: SiteDraft
): CheckedRegistrySettings => {
  if (!registry.settings || draft.registrySettings === null) return { ok: true, value: null }
  const parsed = registry.settings.safeParse(draft.registrySettings)
  if (parsed.success) return { ok: true, value: parsed.data as Record<string, unknown> }
  const issues = fieldIssuesOf(parsed.error)
  return {
    ok: false,
    problems: failureProblems(
      { ok: false, failure: CONTENT_FAILURE.invalid, issues },
      REGISTRY_LOCATION
    )
  }
}

const registrySettingsProblems = (
  registry: AdminRegistry,
  checked: CheckedRegistrySettings,
  media: ReadonlyMap<string, PublishMediaRow>,
  addresses: PageAddresses
) => {
  if (!checked.ok) return checked.problems
  if (!checked.value) return []
  const node = registry.settingsJsonSchema?.()
  if (!node) return []
  const { defaultLocale, locales } = resolveLocaleConfig(registry)
  return [
    ...contentProblems(node, checked.value, media, REGISTRY_LOCATION, defaultLocale),
    ...pageLinkProblems(node, checked.value, addresses, locales, REGISTRY_LOCATION)
  ]
}

const registrySettingsIn = (registry: AdminRegistry, draft: SiteDraft) => {
  const checked = checkRegistrySettings(registry, draft)
  if (!checked.ok || !checked.value) return undefined
  const node = registry.settingsJsonSchema?.()
  return node ? { node, value: checked.value } : undefined
}

const slotsToPublish = (registry: AdminRegistry, draft: SiteDraft) =>
  [...registry.slots.keys()].flatMap((slot) => {
    const stored = draft.blocks.get(slot)
    return stored ? [{ slot, checked: checkSlotBlock(registry, slot, stored) }] : []
  })

const mediaIdsOfRegistrySettings = (registry: AdminRegistry, draft: SiteDraft) => {
  const settings = registrySettingsIn(registry, draft)
  return settings ? mediaIdsIn(settings.node, settings.value) : []
}

export const siteMediaIds = (registry: AdminRegistry, draft: SiteDraft) => [
  ...new Set([
    ...mediaIdsIn(siteSettingsJsonSchema(), draft.settings),
    ...mediaIdsOfRegistrySettings(registry, draft),
    ...slotsToPublish(registry, draft).flatMap(({ checked }) =>
      checked.ok ? mediaIdsIn(registry.jsonSchema(checked.value.block), checked.value.content) : []
    )
  ])
]

export const siteLinkedPageIds = (registry: AdminRegistry, draft: SiteDraft) => {
  const settings = registrySettingsIn(registry, draft)
  return [
    ...new Set([
      ...(settings ? pageLinkIdsIn(settings.node, settings.value) : []),
      ...slotsToPublish(registry, draft).flatMap(({ checked }) =>
        checked.ok
          ? pageLinkIdsIn(registry.jsonSchema(checked.value.block), checked.value.content)
          : []
      )
    ])
  ]
}

const slotProblems = (
  registry: AdminRegistry,
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
  registry: AdminRegistry,
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

const registrySettingsFor = (
  registry: AdminRegistry,
  draft: SiteDraft,
  locale: Locale,
  addresses: PageAddresses
) => {
  const settings = registrySettingsIn(registry, draft)
  return settings
    ? (resolvePageLinks(
        settings.node,
        settings.value,
        locale,
        addresses,
        resolveLocaleConfig(registry)
      ) as Record<string, unknown>)
    : null
}

export const buildSiteSnapshots = (
  registry: AdminRegistry,
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
    ...registrySettingsProblems(registry, checkRegistrySettings(registry, draft), media, addresses),
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
      brand: brandOf(draft.settings),
      settings: registrySettingsFor(registry, draft, locale, addresses),
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
