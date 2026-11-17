import { describe, expect, it } from 'vitest'

import { EMPTY_SITE_SETTINGS, siteSettingsJsonSchema, siteSettingsSchema } from '../src/settings.ts'

describe('siteSettingsSchema', () => {
  it('accepts an empty document', () => {
    expect(siteSettingsSchema.safeParse(EMPTY_SITE_SETTINGS).success).toBe(true)
  })

  it('accepts a name and a default social image', () => {
    const filled = { siteName: { en: 'Studio' }, defaultSocialImage: { id: 'img-1' } }
    expect(siteSettingsSchema.safeParse(filled).success).toBe(true)
  })

  it('accepts a logo and a theme color, and lowercases the color', () => {
    const filled = { siteName: {}, logo: { id: 'img-2' }, themeColor: ' #1A2B3C ' }
    expect(siteSettingsSchema.parse(filled)).toEqual({
      siteName: {},
      logo: { id: 'img-2', alt: '' },
      themeColor: '#1a2b3c'
    })
  })

  it.each(['#abc', '#ABCDEF'])('accepts the hex color %s', (themeColor) => {
    expect(siteSettingsSchema.safeParse({ siteName: {}, themeColor }).success).toBe(true)
  })

  it.each(['red', '1a2b3c', '#12', '#12345', '#ggg', '#1a2b3c4d'])(
    'refuses the theme color %s',
    (themeColor) => {
      expect(siteSettingsSchema.safeParse({ siteName: {}, themeColor }).success).toBe(false)
    }
  )

  it('marks the theme color as a hex color field in the JSON schema', () => {
    const { themeColor } = siteSettingsJsonSchema().properties as Record<string, object>
    expect(themeColor).toMatchObject({ type: 'string', backstage: 'hexColor' })
  })

  it('refuses an empty site name', () => {
    expect(siteSettingsSchema.safeParse({ siteName: { en: ' ' } }).success).toBe(false)
  })

  it('drops the navigation and footer that older settings held', () => {
    const old = { siteName: {}, navigation: [], footer: { text: {}, links: [] } }
    expect(siteSettingsSchema.parse(old)).toEqual({ siteName: {} })
  })
})
