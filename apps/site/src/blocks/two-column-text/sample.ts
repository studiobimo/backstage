import type { z } from 'zod'

import { textColumn } from '../sample-support.ts'
import type { twoColumnTextSchema } from './schema.ts'

export const sample = {
  left: textColumn(['One idea', 'Una idea']),
  right: textColumn(['Another idea', 'Otra idea'])
} satisfies z.input<typeof twoColumnTextSchema>
