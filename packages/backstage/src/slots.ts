import { z } from 'zod'

import { pageBlockSchema } from './pages.ts'

export const siteBlockSchema = pageBlockSchema.omit({ id: true })
export type SiteBlock = z.infer<typeof siteBlockSchema>

export const slotSchema = z.object({
  name: z.string(),
  blocks: z.array(
    z.object({
      name: z.string(),
      version: z.number().int(),
      schema: z.record(z.string(), z.unknown())
    })
  ),
  current: siteBlockSchema.nullable()
})
export type Slot = z.infer<typeof slotSchema>

export const slotsResponseSchema = z.object({ slots: z.array(slotSchema) })
export const slotResponseSchema = z.object({ slot: slotSchema })

export const layoutsResponseSchema = z.object({ layouts: z.array(z.string()) })
