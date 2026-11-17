import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { NO_SITE_BRAND } from '../brand.ts'
import { SITE_SNAPSHOT, type SiteSnapshot } from '../site-publishing.ts'
import { components, loggedErrors } from './blocks-fixture.tsx'
import { renderSlots } from './slots.tsx'

const siteWith = (slots: SiteSnapshot['slots']): SiteSnapshot => ({
  format: SITE_SNAPSHOT.format,
  locale: 'en',
  publishedAt: 1,
  siteName: 'Studio',
  seo: { description: '', socialImageId: null },
  brand: NO_SITE_BRAND,
  slots,
  media: {}
})

const stored = (block: string, content: unknown) =>
  ({ block, schemaVersion: 1, content }) as SiteSnapshot['slots'][string]

describe('renderSlots', () => {
  it('renders the block each slot holds', () => {
    const slots = renderSlots(components, siteWith({ header: stored('header', { text: 'Menu' }) }))
    expect(renderToStaticMarkup(<>{slots.header}</>)).toBe('<header>Menu</header>')
  })

  it('renders nothing when the site was never published', () => {
    expect(renderSlots(components, null)).toEqual({})
  })

  it('drops a slot whose block is not offered, or whose content is invalid', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const notOffered = renderSlots(
      components,
      siteWith({ header: stored('note', { text: 'not a header block' }) })
    )
    const invalid = renderSlots(components, siteWith({ header: stored('header', { text: 7 }) }))
    expect([notOffered, invalid]).toEqual([{}, {}])
    expect(loggedErrors(error)).toEqual([
      expect.objectContaining({ slot: 'header', reason: 'unknown_block' }),
      expect.objectContaining({ slot: 'header', reason: 'invalid_content' })
    ])
  })
})
