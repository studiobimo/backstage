import { z } from 'zod'

import { optionalHeading } from '../schema-parts.ts'

const TURNSTILE_SITE_KEY = { maxLength: 80 } as const

export const contactFormSchema = z.object({
  heading: optionalHeading(),
  turnstileSiteKey: z.string().trim().max(TURNSTILE_SITE_KEY.maxLength).optional()
})
