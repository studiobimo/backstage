import type { z } from 'zod'

import { words } from '../sample-support.ts'
import type { contactFormSchema } from './schema.ts'

export const sample = {
  heading: words('Get in touch', 'Ponte en contacto')
} satisfies z.output<typeof contactFormSchema>
