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

const words = (en: string, es: string) => ({ en, es })

const copy = (en: string, es: string) => ({ en: paragraph(en), es: paragraph(es) })

const photo = { id: PHOTO_ID, alt: '' }
const cta = { href: '/contact', label: 'Contact' }

const INTRO = copy(
  'A short introduction that says what this page is about and why it matters.',
  'Una breve introducción que explica de qué trata esta página y por qué importa.'
)

const LONG = copy(
  'Longer copy reads best in a narrow column. It gives the reader room to follow one idea at a time without losing their place from line to line.',
  'Un texto largo se lee mejor en una columna estrecha. Deja al lector seguir una idea a la vez sin perder el lugar de una línea a otra.'
)

const column = (title: [string, string]) => ({
  heading: words(...title),
  body: INTRO,
  picture: photo,
  cta
})

const textColumn = (title: [string, string]) => ({ heading: words(...title), body: LONG })

export const PREVIEW_SAMPLES: Record<string, unknown> = {
  'overlay-hero': {
    title: words('A headline over the picture', 'Un titular sobre la imagen'),
    body: INTRO,
    cta,
    background: photo,
    tint: 'dark',
    align: 'start'
  },
  'split-hero': {
    title: words('A headline beside the picture', 'Un titular junto a la imagen'),
    body: INTRO,
    cta,
    picture: photo,
    theme: 'light',
    imageSide: 'end'
  },
  'one-column-section': {
    heading: words('A section with its own look', 'Una sección con su propio estilo'),
    body: INTRO,
    picture: photo,
    cta,
    background: 'muted',
    spacing: 'md'
  },
  'one-column-text': {
    heading: words('A narrow column of text', 'Una columna estrecha de texto'),
    body: LONG,
    width: 'narrow'
  },
  'two-column-section': {
    left: column(['First column', 'Primera columna']),
    right: column(['Second column', 'Segunda columna']),
    split: 'equal',
    background: 'none',
    spacing: 'md'
  },
  'two-column-text': {
    left: textColumn(['One idea', 'Una idea']),
    right: textColumn(['Another idea', 'Otra idea'])
  }
}
