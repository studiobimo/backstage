import { labeled, localized } from '@studiobimo/backstage'
import { z } from 'zod'

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
  )
})
