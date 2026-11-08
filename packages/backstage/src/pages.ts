import { z } from 'zod'

export const LOCALES = ['en', 'es'] as const
export type Locale = (typeof LOCALES)[number]

export const PAGE = {
  slug: { maxLength: 80, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  title: { maxLength: 120 }
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
