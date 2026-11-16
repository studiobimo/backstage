import type { z } from 'zod'

import { words } from '../sample-support.ts'
import type { postListSchema } from './schema.ts'

const post = (id: string, title: [string, string], summary: [string, string]) => ({
  id,
  content: { title: words(...title), summary: words(...summary) }
})

export const sample = {
  heading: words('Latest posts', 'Últimas entradas'),
  posts: [
    post(
      'sample-1',
      ['A first post', 'Una primera entrada'],
      ['A short summary of the first post.', 'Un breve resumen de la primera entrada.']
    ),
    post(
      'sample-2',
      ['A second post', 'Una segunda entrada'],
      ['A short summary of the second post.', 'Un breve resumen de la segunda entrada.']
    ),
    post(
      'sample-3',
      ['A third post', 'Una tercera entrada'],
      ['A short summary of the third post.', 'Un breve resumen de la tercera entrada.']
    )
  ]
} satisfies z.output<typeof postListSchema>
