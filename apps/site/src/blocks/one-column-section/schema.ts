import { image, link, localized, richText } from '@studiobimo/backstage'
import { z } from 'zod'

import { optionalHeading, sectionLook } from '../schema-parts.ts'

export const oneColumnSectionSchema = z.object({
  heading: optionalHeading(),
  body: localized(richText()),
  picture: image().optional(),
  cta: link().optional(),
  ...sectionLook
})
