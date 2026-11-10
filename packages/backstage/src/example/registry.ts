import { defineBlock, defineLayout, defineRegistry, SLOT } from '../blocks.ts'
import {
  BareLayout,
  DefaultLayout,
  Hero,
  MinimalLayout,
  SiteFooter,
  SiteHeader
} from './components.tsx'
import { heroSchema, siteFooterSchema, siteHeaderSchema } from './schemas.ts'

const HERO_THUMBNAIL = '/block-thumbnails/hero.svg'

const hero = defineBlock({
  name: 'hero',
  schema: heroSchema,
  component: Hero,
  title: { en: 'Hero', es: 'Hero' },
  description: {
    en: 'A large opening section with a headline, a short intro and a call to action.',
    es: 'Una sección de apertura con titular, una breve introducción y una llamada a la acción.'
  },
  thumbnail: { en: HERO_THUMBNAIL, es: HERO_THUMBNAIL }
})
const siteHeader = defineBlock({
  name: 'site-header',
  schema: siteHeaderSchema,
  component: SiteHeader
})
const siteFooter = defineBlock({
  name: 'site-footer',
  schema: siteFooterSchema,
  component: SiteFooter
})

export const registry = defineRegistry([hero, siteHeader, siteFooter], {
  slots: { [SLOT.header]: [siteHeader.name], [SLOT.footer]: [siteFooter.name] },
  layouts: [
    defineLayout({ name: 'default', component: DefaultLayout }),
    defineLayout({ name: 'minimal', component: MinimalLayout }),
    defineLayout({ name: 'bare', component: BareLayout })
  ]
})
