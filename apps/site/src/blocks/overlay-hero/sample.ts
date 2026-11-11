import type { z } from 'zod'

import { cta, INTRO, photo, words } from '../sample-support.ts'
import type { overlayHeroSchema } from './schema.ts'

export const sample = {
  title: words('A headline over the picture', 'Un titular sobre la imagen'),
  body: INTRO,
  cta,
  background: photo,
  tint: 'dark',
  align: 'start'
} satisfies z.input<typeof overlayHeroSchema>
