import { z } from 'zod'

import { authorshipSchema, slugSchema } from './pages.ts'
import { publishPageSchema } from './publishing.ts'

const expectedVersion = publishPageSchema.shape.expectedVersion

export const createEntrySchema = z.object({
  content: z.json(),
  slugs: z.record(z.string(), slugSchema).optional()
})
export const saveEntrySchema = createEntrySchema.extend({ expectedVersion })
export const reorderEntriesSchema = z.object({ ids: z.array(z.string().min(1)).min(1) })
export const publishEntrySchema = publishPageSchema
export const toggleEntrySchema = z.object({
  field: z.string().min(1),
  value: z.boolean(),
  expectedVersion
})

export const entrySummarySchema = authorshipSchema.extend({
  id: z.string(),
  collection: z.string(),
  version: z.number().int(),
  schemaVersion: z.number().int(),
  label: z.record(z.string(), z.string()),
  position: z.number().int(),
  toggles: z.record(z.string(), z.boolean()).default({}),
  slugs: z.record(z.string(), z.string().nullable()).default({}),
  key: z.string().nullable().default(null),
  createdAt: z.number().int()
})
export type EntrySummary = z.infer<typeof entrySummarySchema>

export const entrySchema = entrySummarySchema.extend({ content: z.json() })
export type Entry = z.infer<typeof entrySchema>

export const entryResponseSchema = z.object({ entry: entrySchema })
export const entriesResponseSchema = z.object({ entries: z.array(entrySummarySchema) })

export const collectionDescriptionSchema = z.object({
  name: z.string(),
  version: z.number().int(),
  label: z.string(),
  route: z.object({ path: z.string() }).optional(),
  quickToggle: z.array(z.string()).optional(),
  snapshot: z.boolean().optional(),
  key: z.string().optional(),
  schema: z.record(z.string(), z.unknown()),
  title: z.record(z.string(), z.string()).optional(),
  description: z.record(z.string(), z.string()).optional()
})

export const collectionsResponseSchema = z.object({
  collections: z.array(collectionDescriptionSchema)
})
