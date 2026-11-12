import { z } from 'zod'

import { LOCALE, perLocaleKeys, type Locale } from './locales.ts'

export type { Locale }
export const LOCALES = LOCALE.default.locales
export const DEFAULT_LOCALE = LOCALE.default.defaultLocale

export const PAGE = {
  slug: { maxLength: 80, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  title: { maxLength: 120 },
  blocks: { maxCount: 100 },
  seo: { title: { maxLength: 70 }, description: { maxLength: 160 } }
} as const

export const perLocale = <T extends z.ZodType>(value: T, locales: readonly Locale[]) =>
  z.object(perLocaleKeys(locales, () => value) as Record<Locale, T>)

const slug = z.string().max(PAGE.slug.maxLength).regex(PAGE.slug.pattern)
const title = z.string().trim().min(1).max(PAGE.title.maxLength)

export const pageInputSchema = (locales: readonly Locale[]) =>
  z.discriminatedUnion('isHome', [
    z.object({
      isHome: z.literal(false),
      slugs: perLocale(slug, locales),
      titles: perLocale(title, locales)
    }),
    z.object({ isHome: z.literal(true), titles: perLocale(title, locales) })
  ])
export type PageInput = z.infer<ReturnType<typeof pageInputSchema>>

export const pageSchema = z.object({
  id: z.string(),
  isHome: z.boolean(),
  version: z.number().int(),
  layout: z.string(),
  updatedAt: z.number().int(),
  publishedAt: z.number().int().nullable(),
  publishedVersion: z.number().int().nullable(),
  publishedBy: z.string().nullable(),
  locales: z.array(z.object({ locale: z.string(), slug: z.string().nullable(), title: z.string() }))
})
export type Page = z.infer<typeof pageSchema>

export const hasUnpublishedChanges = (
  page: Pick<Page, 'publishedAt' | 'publishedVersion' | 'version'>,
  version: number = page.version
) => page.publishedAt !== null && page.publishedVersion !== version

export const pageSummarySchema = pageSchema.extend({
  missing: z.record(z.string(), z.number().int().min(0))
})
export type PageSummary = z.infer<typeof pageSummarySchema>

export const pagesResponseSchema = z.object({ pages: z.array(pageSummarySchema) })

export const pageSlugsOf = (input: PageInput) =>
  Object.entries(input.titles).map(([locale, title]) => ({
    locale,
    slug: input.isHome ? null : input.slugs[locale],
    title
  }))

export const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, PAGE.slug.maxLength)

export const pageBlockSchema = z.object({
  id: z.string().min(1),
  block: z.string().min(1),
  schemaVersion: z.number().int().min(1),
  content: z.json()
})
export type PageBlock = z.infer<typeof pageBlockSchema>

export const pageBlocksSchema = z.object({
  blocks: z
    .array(pageBlockSchema)
    .max(PAGE.blocks.maxCount)
    .refine((blocks) => new Set(blocks.map((block) => block.id)).size === blocks.length)
})
export type PageBlocks = z.infer<typeof pageBlocksSchema>

export const pageBlocksResponseSchema = pageBlocksSchema.extend({
  version: z.number().int(),
  layout: z.string()
})
export type PageBlocksResponse = z.infer<typeof pageBlocksResponseSchema>

const expectedVersion = z.number().int().min(1)

export const renamePageSchema = (locales: readonly Locale[]) =>
  z.intersection(pageInputSchema(locales), z.object({ expectedVersion }))
export const savePageBlocksSchema = pageBlocksSchema.extend({ expectedVersion })
export const savePageLayoutSchema = z.object({ layout: z.string().min(1), expectedVersion })

export const pageStampSchema = z.object({
  version: z.number().int(),
  updatedAt: z.number().int(),
  updatedBy: z.string().nullable()
})
export type PageStamp = z.infer<typeof pageStampSchema>

export const staleVersionSchema = z.object({
  code: z.literal('stale_version'),
  error: z.string(),
  current: pageStampSchema
})

const localeSeoSchema = z.object({
  title: z.string().trim().max(PAGE.seo.title.maxLength),
  description: z.string().trim().max(PAGE.seo.description.maxLength),
  socialImageId: z.string().min(1).nullable()
})
export type LocaleSeo = z.infer<typeof localeSeoSchema>

export const pageSeoSchema = z.record(z.string(), localeSeoSchema)
export type PageSeo = z.infer<typeof pageSeoSchema>

export const pageSeoResponseSchema = z.object({ seo: pageSeoSchema, version: z.number().int() })
export type PageSeoResponse = z.infer<typeof pageSeoResponseSchema>

export const savePageSeoSchema = (locales: readonly Locale[]) =>
  z
    .record(z.string(), z.unknown())
    .transform(({ expectedVersion: version, ...seo }) => ({ seo, expectedVersion: version }))
    .pipe(z.object({ seo: perLocale(localeSeoSchema, locales), expectedVersion }))
