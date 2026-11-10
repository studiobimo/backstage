import { z } from 'zod'

import { image, link, localized, richText } from '../fields.ts'

const menuLink = () => localized(link({ strict: true }))

const optionalHeading = () => localized(z.string().trim().max(120)).optional()

const sectionLook = {
  background: z.enum(['none', 'muted', 'dark']).default('none'),
  spacing: z.enum(['sm', 'md', 'lg']).default('md')
}

const textColumn = () => z.object({ heading: optionalHeading(), body: localized(richText()) })

const sectionColumn = () =>
  z.object({
    heading: optionalHeading(),
    body: localized(richText()),
    picture: image().optional(),
    cta: link().optional()
  })

export const overlayHeroSchema = z.object({
  title: localized(z.string().min(1)),
  body: localized(richText()),
  cta: link().optional(),
  background: image(),
  tint: z.enum(['none', 'light', 'dark']).default('dark'),
  align: z.enum(['start', 'center']).default('start')
})

export const splitHeroSchema = z.object({
  title: localized(z.string().min(1)),
  body: localized(richText()),
  cta: link(),
  picture: image(),
  theme: z.enum(['light', 'dark']).default('light'),
  imageSide: z.enum(['start', 'end']).default('end')
})

export const oneColumnSectionSchema = z.object({
  heading: optionalHeading(),
  body: localized(richText()),
  picture: image().optional(),
  cta: link().optional(),
  ...sectionLook
})

export const oneColumnTextSchema = z.object({
  heading: optionalHeading(),
  body: localized(richText()),
  width: z.enum(['narrow', 'wide']).default('narrow')
})

export const twoColumnSectionSchema = z.object({
  left: sectionColumn(),
  right: sectionColumn(),
  split: z.enum(['equal', 'left', 'right']).default('equal'),
  ...sectionLook
})

export const twoColumnTextSchema = z.object({
  left: textColumn(),
  right: textColumn()
})

export const siteHeaderSchema = z.object({
  navigation: z.array(z.object({ link: menuLink(), dropdown: z.array(menuLink()).max(8) })).max(8),
  cta: menuLink().optional()
})

export const siteFooterSchema = z.object({
  logo: image().optional(),
  text: localized(z.string().trim().max(300)),
  columns: z
    .array(
      z.object({ heading: localized(z.string().trim().min(1)), links: z.array(menuLink()).max(8) })
    )
    .max(4),
  contact: z.object({
    email: z.email().optional(),
    phone: z.string().trim().max(40).optional(),
    address: localized(z.string().trim().max(300))
  })
})
