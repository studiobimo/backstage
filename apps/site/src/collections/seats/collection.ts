import { defineCollection } from '@studiobimo/backstage'

import { SEAT, seatSchema } from './schema.ts'

export const seatsCollection = defineCollection({
  name: SEAT.name,
  label: 'code',
  key: 'code',
  snapshot: true,
  title: { en: 'Seats', es: 'Asientos' },
  schema: seatSchema
})
