import { image, localized } from '@studiobimo/backstage'
import { z } from 'zod'

export const postsSchema = z.object({
  title: localized(z.string().trim().min(1).max(120)),
  summary: localized(z.string().trim().max(300)).optional(),
  cover: image().optional()
})
