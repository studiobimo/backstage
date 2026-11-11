import type { RichTextDoc } from '@studiobimo/backstage'

const PHOTO_ID = 'preview-photo'

export const PREVIEW_MEDIA = {
  [PHOTO_ID]: {
    key: 'block-previews/photo.svg',
    contentType: 'image/svg+xml',
    width: 1200,
    height: 800,
    alt: ''
  }
}

const paragraph = (text: string): RichTextDoc => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
})

export const words = (en: string, es: string) => ({ en, es })

const copy = (en: string, es: string) => ({ en: paragraph(en), es: paragraph(es) })

export const photo = { id: PHOTO_ID, alt: '' }
export const cta = { href: '/contact', label: 'Contact' }

export const INTRO = copy(
  'A short introduction that says what this page is about and why it matters.',
  'Una breve introducción que explica de qué trata esta página y por qué importa.'
)

export const LONG = copy(
  'Longer copy reads best in a narrow column. It gives the reader room to follow one idea at a time without losing their place from line to line.',
  'Un texto largo se lee mejor en una columna estrecha. Deja al lector seguir una idea a la vez sin perder el lugar de una línea a otra.'
)

export const column = (title: [string, string]) => ({
  heading: words(...title),
  body: INTRO,
  picture: photo,
  cta
})

export const textColumn = (title: [string, string]) => ({ heading: words(...title), body: LONG })
