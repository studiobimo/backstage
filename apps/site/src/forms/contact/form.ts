import { defineForm } from '@studiobimo/backstage'
import { z } from 'zod'

export const CONTACT = {
  name: 'contact',
  person: { maxLength: 80 },
  message: { maxLength: 2000 },
  public: { statuses: ['replied'], fields: ['name'] }
} as const

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(CONTACT.person.maxLength),
  email: z.email(),
  message: z.string().trim().min(1).max(CONTACT.message.maxLength)
})

export const contactForm = defineForm(CONTACT.name, {
  schema: contactSchema,
  statuses: ['new', 'replied'],
  notify: { subject: 'New contact message' },
  public: CONTACT.public,
  title: { en: 'Contact', es: 'Contacto' },
  description: {
    en: 'A message from the contact block.',
    es: 'Un mensaje desde el bloque de contacto.'
  }
})
