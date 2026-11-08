import {
  defineBlock,
  defineLayout,
  defineRegistry,
  image,
  link,
  localized,
  richText,
  SLOT
} from '@studiobimo/backstage'
import { z } from 'zod'

const hero = defineBlock({
  name: 'hero',
  schema: z.object({
    title: localized(z.string().min(1)),
    body: localized(richText()),
    cta: link(),
    picture: image(),
    theme: z.enum(['light', 'dark']).default('light')
  }),
  component: () => null
})

const menuLink = () => localized(link({ strict: true }))

const siteHeader = defineBlock({
  name: 'site-header',
  schema: z.object({
    navigation: z
      .array(z.object({ link: menuLink(), dropdown: z.array(menuLink()).max(8) }))
      .max(8),
    cta: menuLink().optional()
  }),
  component: () => null
})

const siteFooter = defineBlock({
  name: 'site-footer',
  schema: z.object({
    logo: image().optional(),
    text: localized(z.string().trim().max(300)),
    columns: z
      .array(
        z.object({
          heading: localized(z.string().trim().min(1)),
          links: z.array(menuLink()).max(8)
        })
      )
      .max(4),
    contact: z.object({
      email: z.email().optional(),
      phone: z.string().trim().max(40).optional(),
      address: localized(z.string().trim().max(300))
    })
  }),
  component: () => null
})

const layout = (name: string) => defineLayout({ name, component: () => null })

export const registry = defineRegistry([hero, siteHeader, siteFooter], {
  slots: { [SLOT.header]: [siteHeader.name], [SLOT.footer]: [siteFooter.name] },
  layouts: [layout('default'), layout('minimal'), layout('bare')]
})
