import type { Page } from '@studiobimo/backstage'

export const aboutPage: Page = {
  id: 'p1',
  isHome: false,
  version: 1,
  layout: 'default',
  updatedAt: 0,
  locales: [
    { locale: 'en', slug: 'about', title: 'About' },
    { locale: 'es', slug: 'acerca', title: 'Acerca' }
  ]
}
