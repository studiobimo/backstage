import { sample as oneColumnSection } from './one-column-section/sample.ts'
import { sample as oneColumnText } from './one-column-text/sample.ts'
import { sample as overlayHero } from './overlay-hero/sample.ts'
import { sample as postList } from './post-list/sample.ts'
import { sample as contactForm } from './contact-form/sample.ts'
import { sample as splitHero } from './split-hero/sample.ts'
import { sample as twoColumnSection } from './two-column-section/sample.ts'
import { sample as twoColumnText } from './two-column-text/sample.ts'
export { PREVIEW_MEDIA } from './sample-support.ts'

export const PREVIEW_SAMPLES: Record<string, unknown> = {
  'overlay-hero': overlayHero,
  'split-hero': splitHero,
  'one-column-section': oneColumnSection,
  'one-column-text': oneColumnText,
  'two-column-section': twoColumnSection,
  'two-column-text': twoColumnText,
  'post-list': postList,
  'contact-form': contactForm
}
