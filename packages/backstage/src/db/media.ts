import { desc, eq } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import type { Media } from '../media.ts'
import { media } from './schema.ts'

const PUBLIC_COLUMNS = {
  id: media.id,
  filename: media.filename,
  contentType: media.contentType,
  size: media.size,
  width: media.width,
  height: media.height,
  decorative: media.decorative,
  alt: media.alt
}

export interface NewMedia extends Media {
  r2Key: string
  uploadedBy: string
}

export const insertMedia = async (d1: AnyD1Database, row: NewMedia) => {
  await drizzle(d1).insert(media).values(row)
}

export const listMedia = (d1: AnyD1Database): Promise<Media[]> =>
  drizzle(d1).select(PUBLIC_COLUMNS).from(media).orderBy(desc(media.createdAt))

export const findMediaFileKey = async (d1: AnyD1Database, id: string) => {
  const [row] = await drizzle(d1).select({ r2Key: media.r2Key }).from(media).where(eq(media.id, id))
  return row?.r2Key ?? null
}

export const deleteMedia = async (d1: AnyD1Database, id: string) => {
  const [row] = await drizzle(d1)
    .delete(media)
    .where(eq(media.id, id))
    .returning({ r2Key: media.r2Key })
  return row?.r2Key ?? null
}
