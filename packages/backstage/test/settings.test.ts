import { describe, expect, it } from 'vitest'

import { EMPTY_SITE_SETTINGS, siteSettingsSchema } from '../src/settings.ts'

describe('siteSettingsSchema', () => {
  it('accepts an empty document', () => {
    expect(siteSettingsSchema.safeParse(EMPTY_SITE_SETTINGS).success).toBe(true)
  })

  it('accepts a name and a default social image', () => {
    const filled = { siteName: { en: 'Studio' }, defaultSocialImage: { id: 'img-1' } }
    expect(siteSettingsSchema.safeParse(filled).success).toBe(true)
  })

  it('refuses an empty site name', () => {
    expect(siteSettingsSchema.safeParse({ siteName: { en: ' ' } }).success).toBe(false)
  })

  it('drops the navigation and footer that older settings held', () => {
    const old = { siteName: {}, navigation: [], footer: { text: {}, links: [] } }
    expect(siteSettingsSchema.parse(old)).toEqual({ siteName: {} })
  })
})
