import type { PageSummary } from '@studiobimo/backstage'

export const aboutPage: PageSummary = {
  id: 'p1',
  isHome: false,
  version: 1,
  layout: 'default',
  updatedAt: 0,
  missing: { en: 0, es: 0 },
  locales: [
    { locale: 'en', slug: 'about', title: 'About' },
    { locale: 'es', slug: 'acerca', title: 'Acerca' }
  ]
}
