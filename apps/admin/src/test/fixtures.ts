import type { EntrySummary, PageSummary } from '@studiobimo/backstage/internal'

export const postsCollection = {
  name: 'posts',
  version: 1,
  label: 'title',
  title: { en: 'Posts', es: 'Artículos' },
  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'object',
        backstage: 'localized',
        additionalProperties: { type: 'string', minLength: 1 },
        title: 'Title'
      }
    },
    required: ['title']
  }
}

export const helloEntry: EntrySummary = {
  id: 'e1',
  collection: 'posts',
  version: 1,
  schemaVersion: 1,
  label: { en: 'Hello world', es: 'Hola mundo' },
  createdAt: 0,
  updatedAt: 1000,
  updatedBy: null,
  publishedAt: null,
  publishedVersion: null,
  publishedBy: null
}

export const aboutPage: PageSummary = {
  id: 'p1',
  isHome: false,
  version: 1,
  layout: 'default',
  updatedAt: 0,
  publishedAt: null,
  publishedVersion: null,
  publishedBy: null,
  missing: { en: 0, es: 0 },
  locales: [
    { locale: 'en', slug: 'about', title: 'About' },
    { locale: 'es', slug: 'acerca', title: 'Acerca' }
  ]
}
