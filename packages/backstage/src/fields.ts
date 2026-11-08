import { z } from 'zod'

export const fieldKinds = ['image', 'richText', 'link', 'localized'] as const
export type FieldKind = (typeof fieldKinds)[number]

const marked = <T extends z.ZodType>(schema: T, backstage: FieldKind): T =>
  schema.meta({ backstage }) as T

export const image = () =>
  marked(z.object({ id: z.string().min(1), alt: z.string().default('') }), 'image')

export const richText = () => marked(z.string(), 'richText')

export const link = () =>
  marked(
    z.object({
      href: z.string().min(1),
      label: z.string().default('')
    }),
    'link'
  )

export const localized = <T extends z.ZodType>(inner: T) =>
  marked(z.partialRecord(z.string(), inner), 'localized')
