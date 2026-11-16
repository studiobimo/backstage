import { z } from 'zod'

import { RICH_TEXT, richTextDoc } from './rich-text.ts'

export type FieldKind = 'image' | 'richText' | 'link' | 'localized' | 'reference'

const marked = <T extends z.ZodType>(schema: T, backstage: FieldKind): T =>
  schema.meta({ backstage }) as T

export const image = () =>
  marked(z.object({ id: z.string().min(1), alt: z.string().default('') }), 'image')

export const richText = () => marked(richTextDoc, 'richText')

export const link = ({ requireLabel = false } = {}) =>
  marked(
    z.object({
      href: z.string().regex(RICH_TEXT.safeHref),
      label: requireLabel ? z.string().trim().min(1) : z.string().default('')
    }),
    'link'
  )

export const localized = <T extends z.ZodType>(inner: T) =>
  marked(z.partialRecord(z.string(), inner), 'localized')
