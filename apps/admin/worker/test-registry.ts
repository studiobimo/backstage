import {
  defineCollection,
  defineForm,
  defineRegistry,
  entries,
  labeled,
  localized
} from '@studiobimo/backstage'
import { z } from 'zod'

const MENU = { name: { maxLength: 80 } } as const

const RESERVATION_FORM = {
  name: 'reservation',
  seats: { min: 1, max: 20 },
  person: { maxLength: 80 },
  time: { pattern: /^([01]\d|2[0-3]):[0-5]\d$/ },
  phone: { pattern: /^\+?[\d\s().-]{6,24}$/ },
  preorder: { maxLines: 10, quantity: { min: 1, max: 20 } }
} as const

const menuCollection = defineCollection({
  name: 'menu',
  label: 'name',
  title: { en: 'Menu', es: 'Carta' },
  schema: z.object({ name: localized(z.string().trim().min(1).max(MENU.name.maxLength)) })
})

const reservationForm = defineForm(RESERVATION_FORM.name, {
  schema: z.object({
    seats: labeled(
      z.number().int().min(RESERVATION_FORM.seats.min).max(RESERVATION_FORM.seats.max),
      { en: { title: 'Seats' }, es: { title: 'Comensales' } }
    ),
    date: z.iso.date(),
    time: z.string().regex(RESERVATION_FORM.time.pattern),
    name: z.string().trim().min(1).max(RESERVATION_FORM.person.maxLength),
    phone: z.string().trim().regex(RESERVATION_FORM.phone.pattern),
    preorder: z
      .array(
        z.object({
          dish: entries(menuCollection, { max: 1 }),
          quantity: z
            .number()
            .int()
            .min(RESERVATION_FORM.preorder.quantity.min)
            .max(RESERVATION_FORM.preorder.quantity.max)
        })
      )
      .max(RESERVATION_FORM.preorder.maxLines)
      .optional()
  }),
  notify: {
    subject: (payload) => `Table for ${String(payload.seats)} on ${String(payload.date)}`,
    exclude: ['phone'],
    html: true
  },
  public: { statuses: ['confirmed'], fields: ['seats', 'date', 'time'] },
  title: { en: 'Reservation', es: 'Reserva' }
})

export const testRegistry = defineRegistry([], {
  collections: [menuCollection],
  forms: [reservationForm]
})
