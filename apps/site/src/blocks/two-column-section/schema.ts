import { z } from 'zod'

import { sectionColumn, sectionLook } from '../schema-parts.ts'

export const twoColumnSectionSchema = z.object({
  left: sectionColumn(),
  right: sectionColumn(),
  split: z.enum(['equal', 'left', 'right']).default('equal'),
  ...sectionLook
})
