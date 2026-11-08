import { describe, expect, it } from 'vitest'

import { EMPTY_SITE_SETTINGS, siteSettingsSchema } from '../src/settings.ts'

const filled = {
  siteName: { en: 'Studio', es: 'Estudio' },
  navigation: [
    { en: { href: '/about', label: 'About' }, es: { href: '/es/acerca', label: 'Acerca' } }
  ],
  footer: { text: { en: '© Studio' }, links: [] },
  contact: { email: 'hello@studio.test', address: { en: '1 Main St' } }
}

describe('siteSettingsSchema', () => {
  it('accepts an empty document', () => {
    expect(siteSettingsSchema.safeParse(EMPTY_SITE_SETTINGS).success).toBe(true)
  })

  it('accepts a filled document', () => {
    expect(siteSettingsSchema.safeParse(filled).success).toBe(true)
  })

  it('refuses a navigation link without a label', () => {
    const navigation = [{ en: { href: '/about', label: ' ' } }]
    expect(siteSettingsSchema.safeParse({ ...filled, navigation }).success).toBe(false)
  })

  it('refuses a link address that could run script', () => {
    const navigation = [{ en: { href: 'javascript:alert(1)', label: 'Go' } }]
    expect(siteSettingsSchema.safeParse({ ...filled, navigation }).success).toBe(false)
  })

  it('refuses a malformed email', () => {
    const contact = { ...filled.contact, email: 'not-an-email' }
    expect(siteSettingsSchema.safeParse({ ...filled, contact }).success).toBe(false)
  })
})
