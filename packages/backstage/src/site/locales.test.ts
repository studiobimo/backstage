import { describe, expect, it } from 'vitest'

import { localeName, switcherLabel } from './locales.ts'

describe('locale names', () => {
  it('names English and Spanish in their own language', () => {
    expect(localeName('en')).toBe('English')
    expect(localeName('es')).toBe('Español')
    expect(switcherLabel('es')).toBe('Idioma')
  })

  it('names any other locale in its own language and labels its switcher in English', () => {
    expect(localeName('fr')).toBe('français')
    expect(switcherLabel('fr')).toBe('Language')
  })
})
