import { describe, expect, it } from 'vitest'

import { LOCALES, type PageSeo } from './pages.ts'
import {
  countMissingTranslations,
  isBlank,
  isMissingTranslation,
  isSeoMissing,
  type TranslatedNode
} from './translations.ts'

const localized: TranslatedNode = { backstage: 'localized' }

const block: TranslatedNode = {
  properties: {
    title: localized,
    columns: { items: { properties: { heading: localized, plain: {} } } },
    contact: { properties: { address: localized } }
  }
}

const doc = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }]
})

describe('isBlank', () => {
  it('treats empty values and empty rich text as blank', () => {
    expect(
      [undefined, null, '', [], {}, doc(''), { href: '', label: undefined }].every(isBlank)
    ).toBe(true)
    expect([0, false, 'x', doc('x'), [1]].some(isBlank)).toBe(false)
  })
})

describe('isMissingTranslation', () => {
  it('needs another language to be filled and this one to be blank', () => {
    expect(isMissingTranslation({ en: 'Hi' }, 'es')).toBe(true)
    expect(isMissingTranslation({ en: 'Hi', es: 'Hola' }, 'es')).toBe(false)
    expect(isMissingTranslation({}, 'es')).toBe(false)
    expect(isMissingTranslation({ en: doc('Hi'), es: doc('') }, 'es')).toBe(true)
  })
})

describe('countMissingTranslations', () => {
  it('walks groups and lists and counts each localized field', () => {
    const content = {
      title: { en: 'Hi' },
      columns: [{ heading: { en: 'One' } }, { heading: { en: 'Two', es: 'Dos' } }],
      contact: { address: { es: 'Avenida Uno' } }
    }
    expect(countMissingTranslations(block, content, 'es')).toBe(2)
    expect(countMissingTranslations(block, content, 'en')).toBe(1)
  })

  it('counts nothing for content that is not there', () => {
    expect(countMissingTranslations(block, undefined, 'es')).toBe(0)
    expect(countMissingTranslations(block, { columns: 'nope' }, 'es')).toBe(0)
  })
})

describe('isSeoMissing', () => {
  const entry = (title: string, description = '') => ({ title, description, socialImageId: null })
  const seo = (en: string, es: string): PageSeo =>
    Object.fromEntries(
      LOCALES.map((locale) => [locale, entry(locale === 'en' ? en : es)])
    ) as PageSeo

  it('flags a language left empty while another has text', () => {
    expect(isSeoMissing(seo('About', ''), 'es')).toBe(true)
    expect(isSeoMissing(seo('', ''), 'es')).toBe(false)
    expect(isSeoMissing(seo('About', 'Acerca'), 'es')).toBe(false)
  })
})
