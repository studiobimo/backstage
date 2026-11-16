import type { SitePreview } from '@studiobimo/backstage/site/hono'

import oneColumnSection from '../src/blocks/one-column-section/thumbnail.svg?raw'
import oneColumnText from '../src/blocks/one-column-text/thumbnail.svg?raw'
import overlayHero from '../src/blocks/overlay-hero/thumbnail.svg?raw'
import postList from '../src/blocks/post-list/thumbnail.svg?raw'
import photo from '../src/blocks/preview-photo.svg?raw'
import splitHero from '../src/blocks/split-hero/thumbnail.svg?raw'
import twoColumnSection from '../src/blocks/two-column-section/thumbnail.svg?raw'
import twoColumnText from '../src/blocks/two-column-text/thumbnail.svg?raw'
import { PREVIEW_PHOTO } from '../src/blocks/sample-support'
import { PREVIEW_MEDIA, PREVIEW_SAMPLES } from '../src/blocks/samples'

export const preview: SitePreview = {
  samples: PREVIEW_SAMPLES,
  media: PREVIEW_MEDIA,
  thumbnails: {
    'one-column-section': oneColumnSection,
    'one-column-text': oneColumnText,
    'overlay-hero': overlayHero,
    'post-list': postList,
    'split-hero': splitHero,
    'two-column-section': twoColumnSection,
    'two-column-text': twoColumnText
  },
  assets: { [PREVIEW_PHOTO.path]: photo }
}
