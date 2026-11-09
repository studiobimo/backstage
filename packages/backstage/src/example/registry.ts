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

const hero = defineBlock({ name: 'hero', schema: heroSchema, component: Hero })
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
