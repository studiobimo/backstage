import { defineBlock, defineLayout, defineRegistry, SLOT } from '../blocks.ts'
import {
  oneColumnSectionSchema,
  oneColumnTextSchema,
  overlayHeroSchema,
  siteFooterSchema,
  siteHeaderSchema,
  splitHeroSchema,
  twoColumnSectionSchema,
  twoColumnTextSchema
} from './schemas.ts'

const thumbnailOf = (name: string) => {
  const path = `/block-thumbnails/${name}.svg`
  return { en: path, es: path }
}

const overlayHero = defineBlock({
  name: 'overlay-hero',
  schema: overlayHeroSchema,
  title: { en: 'Overlay Hero', es: 'Hero con fondo' },
  description: {
    en: 'A full-width background image with the headline and call to action on top, over an optional tint.',
    es: 'Una imagen de fondo a todo el ancho con el titular y la llamada a la acción encima, sobre un tinte opcional.'
  },
  thumbnail: thumbnailOf('overlay-hero')
})

const splitHero = defineBlock({
  name: 'split-hero',
  schema: splitHeroSchema,
  title: { en: 'Split Hero', es: 'Hero dividido' },
  description: {
    en: 'The headline and call to action on one half, a picture on the other.',
    es: 'El titular y la llamada a la acción en una mitad, una imagen en la otra.'
  },
  thumbnail: thumbnailOf('split-hero')
})

const oneColumnSection = defineBlock({
  name: 'one-column-section',
  schema: oneColumnSectionSchema,
  title: { en: 'One-Column Section', es: 'Sección de una columna' },
  description: {
    en: 'A full-width section with its own background and spacing, holding a heading, text, a picture and a button.',
    es: 'Una sección a todo el ancho con su propio fondo y espaciado, con título, texto, imagen y botón.'
  },
  thumbnail: thumbnailOf('one-column-section')
})

const oneColumnText = defineBlock({
  name: 'one-column-text',
  schema: oneColumnTextSchema,
  title: { en: 'One-Column Text', es: 'Texto de una columna' },
  description: {
    en: 'A centered, narrow column of text for articles and announcements.',
    es: 'Una columna de texto centrada y estrecha para artículos y anuncios.'
  },
  thumbnail: thumbnailOf('one-column-text')
})

const twoColumnSection = defineBlock({
  name: 'two-column-section',
  schema: twoColumnSectionSchema,
  title: { en: 'Two-Column Section', es: 'Sección de dos columnas' },
  description: {
    en: 'Two side-by-side columns, equal or 60/40, each with a heading, text, a picture and a button.',
    es: 'Dos columnas lado a lado, iguales o 60/40, cada una con título, texto, imagen y botón.'
  },
  thumbnail: thumbnailOf('two-column-section')
})

const twoColumnText = defineBlock({
  name: 'two-column-text',
  schema: twoColumnTextSchema,
  title: { en: 'Two-Column Text', es: 'Texto a dos columnas' },
  description: {
    en: 'Two columns of text side by side, for comparing ideas or breaking up long copy.',
    es: 'Dos columnas de texto lado a lado, para comparar ideas o dividir textos largos.'
  },
  thumbnail: thumbnailOf('two-column-text')
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
    slots: { [SLOT.header]: [siteHeader.name], [SLOT.footer]: [siteFooter.name] },
    layouts: [
      defineLayout({ name: 'default' }),
      defineLayout({ name: 'minimal' }),
      defineLayout({ name: 'bare' })
    ]
  }
)
