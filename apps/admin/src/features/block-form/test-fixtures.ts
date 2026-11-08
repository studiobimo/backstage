import { image, link, localized, richText } from '@studiobimo/backstage'
import { z } from 'zod'

import type { JsonSchema } from './spec.ts'

export const everyKind = z.object({
  title: localized(z.string().min(1)),
  body: localized(richText()),
  note: richText().optional(),
  cta: link(),
  picture: image(),
  theme: z.enum(['light', 'dark']).default('light'),
  size: z.enum(['s', 'm', 'l']),
  columns: z.number().int().min(1).max(4),
  ratio: z.number().optional(),
  featured: z.boolean().optional(),
  slug: z
    .string()
    .max(5)
    .regex(/^[a-z]+$/),
  items: z
    .array(z.object({ name: z.string().min(1) }))
    .min(1)
    .max(2),
  details: z.object({ credit: z.string().optional() }),
  alt: localized(link()).optional()
})

export const everyKindSchema = z.toJSONSchema(everyKind, { io: 'input' }) as JsonSchema

export const locales = ['en', 'es'] as const
