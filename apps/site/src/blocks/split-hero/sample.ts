import type { z } from 'zod'

import { cta, INTRO, photo, words } from '../sample-support.ts'
import type { splitHeroSchema } from './schema.ts'

export const sample = {
  title: words('A headline beside the picture', 'Un titular junto a la imagen'),
  body: INTRO,
  cta,
  picture: photo,
  theme: 'light',
  imageSide: 'end'
} satisfies z.input<typeof splitHeroSchema>
