import type { z } from 'zod'

import { LONG, words } from '../sample-support.ts'
import type { oneColumnTextSchema } from './schema.ts'

export const sample = {
  heading: words('A narrow column of text', 'Una columna estrecha de texto'),
  body: LONG,
  width: 'narrow'
} satisfies z.input<typeof oneColumnTextSchema>
