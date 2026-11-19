import { z } from 'zod'

import { RICH_TEXT, richTextDoc } from './rich-text.ts'

export type FieldKind =
  'image' | 'richText' | 'link' | 'localized' | 'reference' | 'hexColor' | 'weeklyHours'

export const marked = <T extends z.ZodType>(schema: T, backstage: FieldKind): T =>
  schema.meta({ backstage }) as T

export const image = () =>
  marked(z.object({ id: z.string().min(1), alt: z.string().default('') }), 'image')

export const HEX_COLOR = { pattern: /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/ } as const

export const hexColor = () =>
  marked(z.string().trim().regex(HEX_COLOR.pattern).toLowerCase(), 'hexColor')

export const richText = () => marked(richTextDoc, 'richText')

export const LINK = { kind: { page: 'page' } } as const

export interface ResolvedLink {
  href: string
  label: string
}

export interface LinkInput {
  href?: string
  kind?: typeof LINK.kind.page
  pageId?: string
  label?: string
}

const linkShapes = <L extends z.ZodType<string>>(label: L) =>
  z.union([
    z.object({ kind: z.literal(LINK.kind.page), pageId: z.string().min(1), label }),
    z.object({ href: z.string().regex(RICH_TEXT.safeHref), label })
  ])

export const linkValueSchema = linkShapes(z.string().default(''))
export type LinkValue = z.output<typeof linkValueSchema>

export const link = ({ requireLabel = false } = {}) =>
  marked(
    linkShapes(requireLabel ? z.string().trim().min(1) : z.string().default('')),
    'link'
  ) as unknown as z.ZodType<ResolvedLink, LinkInput>

export const localized = <T extends z.ZodType>(inner: T) =>
  marked(z.partialRecord(z.string(), inner), 'localized')
