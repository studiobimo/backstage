import { BOOKING, defineForm, timeOfDay } from '@studiobimo/backstage'
import { z } from 'zod'

export const BOOKING_FORM = {
  name: 'booking',
  person: { maxLength: 80 },
  resource: { maxLength: 60 },
  public: { statuses: ['confirmed'] }
} as const

export const bookingSchema = z.object({
  [BOOKING.fields.resource]: z.string().trim().min(1).max(BOOKING_FORM.resource.maxLength),
  [BOOKING.fields.date]: z.iso.date(),
  [BOOKING.fields.start]: timeOfDay(),
  [BOOKING.fields.end]: timeOfDay(),
  name: z.string().trim().min(1).max(BOOKING_FORM.person.maxLength),
  email: z.email()
})

export const bookingForm = defineForm(BOOKING_FORM.name, {
  schema: bookingSchema,
  public: {
    ...BOOKING_FORM.public,
    fields: [BOOKING.fields.resource, BOOKING.fields.date, BOOKING.fields.start, BOOKING.fields.end]
  },
  title: { en: 'Booking', es: 'Reserva' },
  description: {
    en: 'A request for a time slot.',
    es: 'Una solicitud de horario.'
  }
})
