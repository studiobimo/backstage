import { defineComponents } from '@studiobimo/backstage'

import { BareLayout, DefaultLayout, MinimalLayout } from './layouts.tsx'
import { OneColumnSection } from './one-column-section/component.tsx'
import { OneColumnText } from './one-column-text/component.tsx'
import { OverlayHero } from './overlay-hero/component.tsx'
import { SiteFooter } from './site-footer/component.tsx'
import { SiteHeader } from './site-header/component.tsx'
import { SplitHero } from './split-hero/component.tsx'
import { TwoColumnSection } from './two-column-section/component.tsx'
import { TwoColumnText } from './two-column-text/component.tsx'
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
