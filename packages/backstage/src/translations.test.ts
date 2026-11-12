import { describe, expect, it } from 'vitest'

import type { PageSeo } from './pages.ts'
import {
  countMissingTranslations,
  isBlank,
  isMissingTranslation,
  isSeoMissing,
  lacksDefaultLocale,
  markedFieldsIn,
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
  const seo = (en: string, es: string): PageSeo => ({ en: entry(en), es: entry(es) })

  it('flags a language left empty while another has text', () => {
    expect(isSeoMissing(seo('About', ''), 'es')).toBe(true)
    expect(isSeoMissing(seo('', ''), 'es')).toBe(false)
    expect(isSeoMissing(seo('About', 'Acerca'), 'es')).toBe(false)
  })
})

describe('markedFieldsIn', () => {
  const link: TranslatedNode = { backstage: 'link' }
  const schema: TranslatedNode = {
    required: ['cta'],
    properties: {
      cta: link,
      menu: { items: { properties: { target: { additionalProperties: link } } } }
    }
  }

  it('returns each marked field with its path', () => {
    const content = {
      cta: { href: '/a' },
      menu: [{ target: { en: { href: '/b' }, es: { href: '/c' } } }, { target: {} }]
    }
    expect(markedFieldsIn(schema, content, 'link')).toEqual([
      { path: 'cta', value: { href: '/a' }, required: true },
      { path: 'menu[0].target.en', value: { href: '/b' }, required: true },
      { path: 'menu[0].target.es', value: { href: '/c' }, required: true }
    ])
  })

  it('finds nothing of another kind and tolerates missing content', () => {
    expect(markedFieldsIn(schema, {}, 'image')).toEqual([])
    expect(markedFieldsIn(schema, undefined, 'link')).toEqual([
      { path: 'cta', value: undefined, required: true }
    ])
  })
})

describe('required marked fields', () => {
  const schema: TranslatedNode = {
    required: ['title'],
    properties: { title: localized, subtitle: localized }
  }

  it('tells a field listed as required from one that is not', () => {
    const required = markedFieldsIn(schema, {}, 'localized').map(({ path, required }) => [
      path,
      required
    ])
    expect(required).toEqual([
      ['title', true],
      ['subtitle', false]
    ])
  })
})

describe('lacksDefaultLocale', () => {
  it('needs a non-blank value in the default language', () => {
    expect(lacksDefaultLocale(undefined, 'en')).toBe(true)
    expect(lacksDefaultLocale({}, 'en')).toBe(true)
    expect(lacksDefaultLocale({ es: 'Hola' }, 'en')).toBe(true)
    expect(lacksDefaultLocale({ en: '' }, 'en')).toBe(true)
    expect(lacksDefaultLocale({ en: doc('') }, 'en')).toBe(true)
    expect(lacksDefaultLocale({ en: 'Hi' }, 'en')).toBe(false)
    expect(lacksDefaultLocale({ es: 'Hola' }, 'es')).toBe(false)
  })
})
