import { image, link, localized, richText } from '@studiobimo/backstage'
import { z } from 'zod'

export const menuLink = () => localized(link({ strict: true }))

export const ctaLink = () => localized(link())

export const optionalHeading = () => localized(z.string().trim().max(120)).optional()

export const sectionLook = {
  background: z.enum(['none', 'muted', 'dark']).default('none'),
  spacing: z.enum(['sm', 'md', 'lg']).default('md')
}

export const textColumn = () =>
  z.object({ heading: optionalHeading(), body: localized(richText()) })

export const sectionColumn = () =>
  z.object({
    heading: optionalHeading(),
    body: localized(richText()),
    picture: image().optional(),
    cta: ctaLink().optional()
  })
