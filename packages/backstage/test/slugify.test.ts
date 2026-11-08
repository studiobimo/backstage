import { describe, expect, it } from 'vitest'

import { PAGE, slugify } from '../src/pages.ts'

describe('slugify', () => {
  it('lowercases, strips accents and joins words with hyphens', () => {
    expect(slugify('  Acerca de Nosotros — Ñandú! ')).toBe('acerca-de-nosotros-nandu')
  })

  it('produces a value the slug rule accepts', () => {
    expect(PAGE.slug.pattern.test(slugify('Our Team & Story'))).toBe(true)
  })
})
