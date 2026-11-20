import { labeled, localized, weeklyHours } from '@studiobimo/backstage'
import { z } from 'zod'

const BOOKING_SETTINGS = {
  step: { fallbackMinutes: 30 },
  leadTime: { fallbackMinutes: 0 }
} as const

const minutes = () => z.number().int().positive()

const CONTACT = { phoneMaxLength: 40, addressMaxLength: 300 } as const

export const siteSettingsSchema = z.object({
  contact: labeled(
    z.object({
      phone: labeled(z.string().trim().max(CONTACT.phoneMaxLength), {
        en: { title: 'Phone' },
        es: { title: 'Teléfono' }
      }),
      address: labeled(localized(z.string().trim().max(CONTACT.addressMaxLength)), {
        en: { title: 'Address' },
        es: { title: 'Dirección' }
      })
    }),
    { en: { title: 'Contact' }, es: { title: 'Contacto' } }
  ),
  booking: labeled(
    z.object({
      hours: labeled(weeklyHours(), { en: { title: 'Hours' }, es: { title: 'Horario' } }),
      step: labeled(minutes().default(BOOKING_SETTINGS.step.fallbackMinutes), {
        en: { title: 'Minutes between starts' },
        es: { title: 'Minutos entre inicios' }
      }),
      leadTime: labeled(
        z.number().int().min(0).default(BOOKING_SETTINGS.leadTime.fallbackMinutes),
        { en: { title: 'Minimum notice in minutes' }, es: { title: 'Aviso mínimo en minutos' } }
      ),
      minDuration: labeled(minutes().optional(), {
        en: { title: 'Shortest booking in minutes' },
        es: { title: 'Reserva más corta en minutos' }
      }),
      maxDuration: labeled(minutes().optional(), {
        en: { title: 'Longest booking in minutes' },
        es: { title: 'Reserva más larga en minutos' }
      })
    }),
    { en: { title: 'Bookings' }, es: { title: 'Reservas' } }
  ).optional()
})
