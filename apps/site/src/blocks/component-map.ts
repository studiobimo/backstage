import { defineComponents } from '@studiobimo/backstage'

import {
  BareLayout,
  DefaultLayout,
  MinimalLayout,
  OneColumnSection,
  OneColumnText,
  OverlayHero,
  SiteFooter,
  SiteHeader,
  SplitHero,
  TwoColumnSection,
  TwoColumnText
} from './components.tsx'
import { registry } from './registry.ts'

export const components = defineComponents(registry, {
  blocks: {
    'overlay-hero': OverlayHero,
    'split-hero': SplitHero,
    'one-column-section': OneColumnSection,
    'one-column-text': OneColumnText,
    'two-column-section': TwoColumnSection,
    'two-column-text': TwoColumnText,
    'site-header': SiteHeader,
    'site-footer': SiteFooter
  },
  layouts: { default: DefaultLayout, minimal: MinimalLayout, bare: BareLayout }
})
