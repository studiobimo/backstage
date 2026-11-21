import type { Context } from 'hono'

import { keyOf, keyProblemOf } from '../collection-key.ts'
import type { Collection } from '../collections.ts'
import { findPublishedContent, isKeyTaken } from '../db/entries.ts'
import { API_ERROR } from '../errors.ts'

import type { AccessEnv } from './auth.ts'
import { respondKeyProblem } from './respond.ts'

export const refuseEntryKey = async (
  c: Context<AccessEnv>,
  collection: Collection,
  id: string,
  content: unknown
): Promise<Response | null> => {
  const field = collection.key
  if (field === undefined) return null
  const published = await findPublishedContent(c.env.DB, collection, id)
  const problem = keyProblemOf(collection, content, published?.content)
  if (problem) return respondKeyProblem(c, field, problem)
  const key = keyOf(collection, content)
  const taken = key !== null && (await isKeyTaken(c.env.DB, collection, key, id))
  return taken ? respondKeyProblem(c, field, API_ERROR.keyTaken) : null
}
