import { eq } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import { users } from './schema.ts'

export interface Editor {
  email: string
  name: string
}

export const ensureUser = async (d1: AnyD1Database, editor: Editor) => {
  const db = drizzle(d1)
  await db
    .insert(users)
    .values({ id: crypto.randomUUID(), ...editor })
    .onConflictDoNothing({ target: users.email })
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, editor.email))
  return user!.id
}
