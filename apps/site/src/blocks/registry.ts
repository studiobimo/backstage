import {
  defineBlock,
  defineCollection,
  defineLayout,
  defineRegistry,
  SLOT
} from '@studiobimo/backstage'

import { postsSchema } from '../collections/posts/schema.ts'
import { SITE_LOCALES } from './locales.ts'
import { BLOCK_VERSION, migrateColumnCtas, migrateCta } from './migrations.ts'
import { oneColumnSectionSchema } from './one-column-section/schema.ts'
import { oneColumnTextSchema } from './one-column-text/schema.ts'
import { overlayHeroSchema } from './overlay-hero/schema.ts'
import { siteFooterSchema } from './site-footer/schema.ts'
import { siteHeaderSchema } from './site-header/schema.ts'
import { splitHeroSchema } from './split-hero/schema.ts'
import { twoColumnSectionSchema } from './two-column-section/schema.ts'
import { twoColumnTextSchema } from './two-column-text/schema.ts'

const overlayHero = defineBlock({
  name: 'overlay-hero',
  version: BLOCK_VERSION.localizedCta,
  migrate: migrateCta,
  schema: overlayHeroSchema,
  title: { en: 'Overlay Hero', es: 'Hero con fondo' },
  description: {
    en: 'A full-width background image with the headline and call to action on top, over an optional tint.',
    es: 'Una imagen de fondo a todo el ancho con el titular y la llamada a la acción encima, sobre un tinte opcional.'
  }
})

const splitHero = defineBlock({
  name: 'split-hero',
  version: BLOCK_VERSION.localizedCta,
  migrate: migrateCta,
  schema: splitHeroSchema,
  title: { en: 'Split Hero', es: 'Hero dividido' },
  description: {
    en: 'The headline and call to action on one half, a picture on the other.',
    es: 'El titular y la llamada a la acción en una mitad, una imagen en la otra.'
  }
})

const oneColumnSection = defineBlock({
  name: 'one-column-section',
  version: BLOCK_VERSION.localizedCta,
  migrate: migrateCta,
  schema: oneColumnSectionSchema,
  title: { en: 'One-Column Section', es: 'Sección de una columna' },
  description: {
    en: 'A full-width section with its own background and spacing, holding a heading, text, a picture and a button.',
    es: 'Una sección a todo el ancho con su propio fondo y espaciado, con título, texto, imagen y botón.'
  }
})

const oneColumnText = defineBlock({
  name: 'one-column-text',
  schema: oneColumnTextSchema,
  title: { en: 'One-Column Text', es: 'Texto de una columna' },
  description: {
    en: 'A centered, narrow column of text for articles and announcements.',
    es: 'Una columna de texto centrada y estrecha para artículos y anuncios.'
  }
})

const twoColumnSection = defineBlock({
  name: 'two-column-section',
  version: BLOCK_VERSION.localizedCta,
  migrate: migrateColumnCtas,
  schema: twoColumnSectionSchema,
  title: { en: 'Two-Column Section', es: 'Sección de dos columnas' },
  description: {
    en: 'Two side-by-side columns, equal or 60/40, each with a heading, text, a picture and a button.',
    es: 'Dos columnas lado a lado, iguales o 60/40, cada una con título, texto, imagen y botón.'
  }
})

const twoColumnText = defineBlock({
  name: 'two-column-text',
  schema: twoColumnTextSchema,
  title: { en: 'Two-Column Text', es: 'Texto a dos columnas' },
  description: {
    en: 'Two columns of text side by side, for comparing ideas or breaking up long copy.',
    es: 'Dos columnas de texto lado a lado, para comparar ideas o dividir textos largos.'
  }
})

const posts = defineCollection({
  name: 'posts',
  label: 'title',
  title: { en: 'Posts', es: 'Entradas' },
  schema: postsSchema
})

const siteHeader = defineBlock({
  name: 'site-header',
  schema: siteHeaderSchema
})
const siteFooter = defineBlock({
  name: 'site-footer',
  schema: siteFooterSchema
})

export const registry = defineRegistry(
  [
    overlayHero,
    splitHero,
    oneColumnSection,
    oneColumnText,
    twoColumnSection,
    twoColumnText,
    siteHeader,
    siteFooter
  ],
  {
    ...SITE_LOCALES,
    slots: { [SLOT.header]: [siteHeader.name], [SLOT.footer]: [siteFooter.name] },
    layouts: [
      defineLayout({ name: 'default' }),
      defineLayout({ name: 'minimal' }),
      defineLayout({ name: 'bare' })
    ],
    collections: [posts]
  }
)
