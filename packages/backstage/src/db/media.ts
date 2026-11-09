import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import type { Media } from '../media.ts'
import { media } from './schema.ts'

export interface NewMedia extends Media {
  r2Key: string
  uploadedBy: string
}

export const insertMedia = async (d1: AnyD1Database, row: NewMedia) => {
  await drizzle(d1).insert(media).values(row)
}
