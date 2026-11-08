import { image, link } from '@studiobimo/backstage'
import { z } from 'zod'

import type { JsonSchema } from './spec.ts'

export const everyKind = z.object({
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
  details: z.object({ credit: z.string().optional() })
})

export const everyKindSchema = z.toJSONSchema(everyKind, { io: 'input' }) as JsonSchema
