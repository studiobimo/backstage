import {
  defineBlock,
  defineRegistry,
  image,
  link,
  localized,
  richText
} from '@studiobimo/backstage'
import { z } from 'zod'

const hero = defineBlock({
  name: 'hero',
  schema: z.object({
    title: localized(z.string().min(1)),
    body: localized(richText()),
    cta: link(),
    picture: image(),
    theme: z.enum(['light', 'dark']).default('light')
  }),
  component: () => null
})

export const registry = defineRegistry([hero])
