import type { z } from 'zod'

import { column } from '../sample-support.ts'
import type { twoColumnSectionSchema } from './schema.ts'

export const sample = {
  left: column(['First column', 'Primera columna']),
  right: column(['Second column', 'Segunda columna']),
  split: 'equal',
  background: 'none',
  spacing: 'md'
} satisfies z.input<typeof twoColumnSectionSchema>
