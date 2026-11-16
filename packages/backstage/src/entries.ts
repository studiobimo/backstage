import { z } from 'zod'

import { publishPageSchema } from './publishing.ts'

const expectedVersion = publishPageSchema.shape.expectedVersion

export const createEntrySchema = z.object({ content: z.json() })
export const saveEntrySchema = createEntrySchema.extend({ expectedVersion })
export const publishEntrySchema = publishPageSchema

export const entrySummarySchema = z.object({
  id: z.string(),
  collection: z.string(),
  version: z.number().int(),
  schemaVersion: z.number().int(),
  label: z.record(z.string(), z.string()),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  updatedBy: z.string().nullable(),
  publishedAt: z.number().int().nullable(),
  publishedVersion: z.number().int().nullable(),
  publishedBy: z.string().nullable()
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
  schema: z.record(z.string(), z.unknown()),
  title: z.record(z.string(), z.string()).optional(),
  description: z.record(z.string(), z.string()).optional()
})

export const collectionsResponseSchema = z.object({
  collections: z.array(collectionDescriptionSchema)
})
