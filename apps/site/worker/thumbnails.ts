import oneColumnSection from '../src/blocks/one-column-section/thumbnail.svg?raw'
import oneColumnText from '../src/blocks/one-column-text/thumbnail.svg?raw'
import overlayHero from '../src/blocks/overlay-hero/thumbnail.svg?raw'
import splitHero from '../src/blocks/split-hero/thumbnail.svg?raw'
import twoColumnSection from '../src/blocks/two-column-section/thumbnail.svg?raw'
import twoColumnText from '../src/blocks/two-column-text/thumbnail.svg?raw'

export const THUMBNAIL = {
  file: 'thumbnail.svg',
  contentType: 'image/svg+xml',
  cacheControl: 'public, max-age=86400, stale-while-revalidate=604800'
} as const

const BLOCK_THUMBNAILS: ReadonlyMap<string, string> = new Map([
  ['one-column-section', oneColumnSection],
  ['one-column-text', oneColumnText],
  ['overlay-hero', overlayHero],
  ['split-hero', splitHero],
  ['two-column-section', twoColumnSection],
  ['two-column-text', twoColumnText]
])

export const thumbnailOf = (blockName: string) => BLOCK_THUMBNAILS.get(blockName)
