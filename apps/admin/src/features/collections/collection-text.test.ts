import { describe, expect, it } from 'vitest'

import { collectionTitle, entryLabelText } from './collection-text'

describe('collectionTitle', () => {
  const posts = { name: 'posts', title: { en: 'Blog posts', es: 'Artículos' } }

  it('uses the title in the editor language', () => {
    expect(collectionTitle(posts, 'es-MX', 'en')).toBe('Artículos')
  })

  it('falls back to the default locale, then to the name', () => {
    expect(collectionTitle({ name: 'posts', title: { en: 'Posts' } }, 'es', 'en')).toBe('Posts')
    expect(collectionTitle({ name: 'posts' }, 'es', 'en')).toBe('posts')
  })
})

describe('entryLabelText', () => {
  it('prefers the editor language, then the default locale, then any label', () => {
    expect(entryLabelText({ en: 'Hello', es: 'Hola' }, 'es', 'en')).toBe('Hola')
    expect(entryLabelText({ en: 'Hello' }, 'es', 'en')).toBe('Hello')
    expect(entryLabelText({ fr: 'Bonjour' }, 'es', 'en')).toBe('Bonjour')
    expect(entryLabelText({}, 'es', 'en')).toBe('')
  })
})
