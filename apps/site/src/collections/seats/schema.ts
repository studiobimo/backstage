import { z } from 'zod'

export const SEAT = {
  name: 'seat',
  zones: ['bar', 'patio', 'main'],
  code: { maxLength: 20 }
} as const

export const seatSchema = z.object({
  code: z.string().trim().min(1).max(SEAT.code.maxLength),
  zone: z.enum(SEAT.zones),
  capacity: z.number().int().min(1)
})

export type Seat = z.output<typeof seatSchema>
