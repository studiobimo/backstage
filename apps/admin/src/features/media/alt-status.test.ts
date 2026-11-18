import { describe, expect, it } from 'vitest'

import { ALT_STATUS, altStatusOf, filterMedia, usedBytesOf } from './alt-status'

const LOCALES = ['en', 'es']

describe('altStatusOf', () => {
  it('is described when every locale has a description', () => {
    expect(altStatusOf({ decorative: false, alt: { en: 'A', es: 'B' } }, LOCALES)).toBe(
      ALT_STATUS.described
    )
  })

  it('is missing when a locale has none or only blanks', () => {
    expect(altStatusOf({ decorative: false, alt: { en: 'A' } }, LOCALES)).toBe(ALT_STATUS.missing)
    expect(altStatusOf({ decorative: false, alt: { en: 'A', es: '  ' } }, LOCALES)).toBe(
      ALT_STATUS.missing
    )
  })

  it('is decorative when marked so, whatever the text', () => {
    expect(altStatusOf({ decorative: true, alt: {} }, LOCALES)).toBe(ALT_STATUS.decorative)
  })
})

describe('filterMedia', () => {
  const items: { filename: string; alt: Record<string, string> }[] = [
    { filename: 'chair.jpg', alt: { en: 'A wooden seat', es: 'Una silla' } },
    { filename: 'table.png', alt: {} }
  ]

  it('keeps everything for an empty query', () => {
    expect(filterMedia(items, '  ')).toEqual(items)
  })

  it('matches the file name or any description, ignoring case', () => {
    expect(filterMedia(items, 'CHAIR')).toEqual([items[0]])
    expect(filterMedia(items, 'silla')).toEqual([items[0]])
    expect(filterMedia(items, 'table')).toEqual([items[1]])
    expect(filterMedia(items, 'lamp')).toEqual([])
  })
})

describe('usedBytesOf', () => {
  it('adds up the sizes', () => {
    expect(usedBytesOf([{ size: 10 }, { size: 32 }])).toBe(42)
    expect(usedBytesOf([])).toBe(0)
  })
})
