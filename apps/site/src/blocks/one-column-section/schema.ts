import { image, localized, richText } from '@studiobimo/backstage'
import { z } from 'zod'

import { ctaLink, optionalHeading, sectionLook } from '../schema-parts.ts'

export const oneColumnSectionSchema = z.object({
  heading: optionalHeading(),
  body: localized(richText()),
  picture: image().optional(),
  cta: ctaLink().optional(),
  ...sectionLook
})
