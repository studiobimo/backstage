import { z } from 'zod'

import { textColumn } from '../schema-parts.ts'

export const twoColumnTextSchema = z.object({
  left: textColumn(),
  right: textColumn()
})
