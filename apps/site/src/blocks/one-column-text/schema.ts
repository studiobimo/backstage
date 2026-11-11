import { localized, richText } from '@studiobimo/backstage'
import { z } from 'zod'

import { optionalHeading } from '../schema-parts.ts'

export const oneColumnTextSchema = z.object({
  heading: optionalHeading(),
  body: localized(richText()),
  width: z.enum(['narrow', 'wide']).default('narrow')
})
