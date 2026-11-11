import type { z } from 'zod'

import { cta, INTRO, photo, words } from '../sample-support.ts'
import type { oneColumnSectionSchema } from './schema.ts'

export const sample = {
  heading: words('A section with its own look', 'Una sección con su propio estilo'),
  body: INTRO,
  picture: photo,
  cta,
  background: 'muted',
  spacing: 'md'
} satisfies z.input<typeof oneColumnSectionSchema>
