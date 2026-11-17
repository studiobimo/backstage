import { and, asc, eq, ne, or, sql } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import { ROLE, type CurrentUser, type Role, type User } from '../users.ts'
import { sessions, users } from './schema.ts'

export interface Identity {
  email: string
  name: string
}

export type Editor = CurrentUser

const OWNER_EMAIL_SEPARATOR = ','
const editorColumns = { id: users.id, email: users.email, name: users.name, role: users.role }

export const ownerEmailsOf = (value: string | undefined) =>
  (value ?? '')
    .split(OWNER_EMAIL_SEPARATOR)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

export const ensureUser = async (d1: AnyD1Database, editor: Identity) => {
  const db = drizzle(d1)
  await db
    .insert(users)
    .values({ id: crypto.randomUUID(), email: editor.email, name: editor.name })
    .onConflictDoNothing({ target: users.email })
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, editor.email))
  return user!.id
}

export const findUserByEmail = async (d1: AnyD1Database, email: string): Promise<Editor | null> => {
  const [user] = await drizzle(d1)
    .select(editorColumns)
    .from(users)
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
  return user ?? null
}

export const findUserById = async (d1: AnyD1Database, id: string): Promise<Editor | null> => {
  const [user] = await drizzle(d1).select(editorColumns).from(users).where(eq(users.id, id))
  return user ?? null
}

export const listUsers = (d1: AnyD1Database): Promise<User[]> =>
  drizzle(d1)
    .select({ ...editorColumns, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.createdAt), asc(users.email))

const anotherOwnerExists = sql`(select count(*) from ${users} where ${users.role} = ${ROLE.owner}) > 1`

const unlessLastOwner = or(ne(users.role, ROLE.owner), anotherOwnerExists)

export const inviteUser = async (
  d1: AnyD1Database,
  invite: { email: string; role: Role }
): Promise<User | null> => {
  if (await findUserByEmail(d1, invite.email)) return null
  const [user] = await drizzle(d1)
    .insert(users)
    .values({ id: crypto.randomUUID(), ...invite })
    .onConflictDoNothing({ target: users.email })
    .returning({ ...editorColumns, createdAt: users.createdAt })
  return user ?? null
}

export const setUserRole = async (
  d1: AnyD1Database,
  id: string,
  role: Role
): Promise<Editor | null> => {
  const [user] = await drizzle(d1)
    .update(users)
    .set({ role })
    .where(and(eq(users.id, id), role === ROLE.owner ? undefined : unlessLastOwner))
    .returning(editorColumns)
  return user ?? null
}

export const removeUser = async (d1: AnyD1Database, id: string) => {
  const db = drizzle(d1)
  const removed = await db
    .delete(users)
    .where(and(eq(users.id, id), unlessLastOwner))
    .returning({ id: users.id })
  if (removed.length === 0) return false
  await db.delete(sessions).where(eq(sessions.userId, id))
  return true
}

export const resolveUser = async (
  d1: AnyD1Database,
  identity: Identity,
  ownerEmails: readonly string[]
): Promise<Editor | null> => {
  const email = identity.email.trim().toLowerCase()
  const existing = await findUserByEmail(d1, email)
  if (!ownerEmails.includes(email)) return existing
  if (!existing) {
    await drizzle(d1)
      .insert(users)
      .values({ id: crypto.randomUUID(), email, name: identity.name, role: ROLE.owner })
      .onConflictDoNothing({ target: users.email })
    return findUserByEmail(d1, email)
  }
  return existing.role === ROLE.owner ? existing : setUserRole(d1, existing.id, ROLE.owner)
}
