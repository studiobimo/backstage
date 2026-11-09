import { z } from 'zod'

export const LOCALES = ['en', 'es'] as const
export type Locale = (typeof LOCALES)[number]

export const PAGE = {
  slug: { maxLength: 80, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  title: { maxLength: 120 },
  blocks: { maxCount: 100 }
} as const

const perLocale = <T extends z.ZodType>(value: T) =>
  z.object(Object.fromEntries(LOCALES.map((locale) => [locale, value])) as Record<Locale, T>)

const slug = z.string().max(PAGE.slug.maxLength).regex(PAGE.slug.pattern)
const title = z.string().trim().min(1).max(PAGE.title.maxLength)

const regularPage = z.object({
  isHome: z.literal(false),
  slugs: perLocale(slug),
  titles: perLocale(title)
})

const homePage = z.object({
  isHome: z.literal(true),
  titles: perLocale(title)
})

export const pageInputSchema = z.discriminatedUnion('isHome', [regularPage, homePage])
export type PageInput = z.infer<typeof pageInputSchema>

export const pageSchema = z.object({
  id: z.string(),
  isHome: z.boolean(),
  version: z.number().int(),
  layout: z.string(),
  updatedAt: z.number().int(),
  locales: z.array(z.object({ locale: z.string(), slug: z.string().nullable(), title: z.string() }))
})
export type Page = z.infer<typeof pageSchema>

export const pagesResponseSchema = z.object({ pages: z.array(pageSchema) })

export const pageSlugsOf = (input: PageInput) =>
  LOCALES.map((locale) => ({
    locale,
    slug: input.isHome ? null : input.slugs[locale],
    title: input.titles[locale]
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
