import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm'
import { drizzle, type AnyD1Database } from 'drizzle-orm/d1'

import { authAttempts, loginTokens, sessions, users } from './schema.ts'
import type { Editor } from './users.ts'

export const findUserByEmail = async (d1: AnyD1Database, email: string) => {
  const [user] = await drizzle(d1)
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
  return user ?? null
}

export const storeLoginToken = (
  d1: AnyD1Database,
  token: { tokenHash: string; email: string; expiresAt: number }
) => drizzle(d1).insert(loginTokens).values(token)

export const consumeLoginToken = async (d1: AnyD1Database, tokenHash: string, now: number) => {
  const [consumed] = await drizzle(d1)
    .update(loginTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(loginTokens.tokenHash, tokenHash),
        isNull(loginTokens.usedAt),
        gt(loginTokens.expiresAt, now)
      )
    )
    .returning({ email: loginTokens.email })
  return consumed?.email ?? null
}

export const createSession = (
  d1: AnyD1Database,
  session: { idHash: string; userId: string; expiresAt: number }
) => drizzle(d1).insert(sessions).values(session)

export const findSessionEditor = async (
  d1: AnyD1Database,
  idHash: string,
  now: number
): Promise<Editor | null> => {
  const [editor] = await drizzle(d1)
    .select({ email: users.email, name: users.name })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.idHash, idHash), gt(sessions.expiresAt, now)))
  return editor ?? null
}

export const deleteSession = (d1: AnyD1Database, idHash: string) =>
  drizzle(d1).delete(sessions).where(eq(sessions.idHash, idHash))

export const recordAttempt = (d1: AnyD1Database, bucket: string, now: number) =>
  drizzle(d1).insert(authAttempts).values({ bucket, createdAt: now })

export const countAttempts = async (d1: AnyD1Database, bucket: string, since: number) => {
  const [row] = await drizzle(d1)
    .select({ total: sql<number>`count(*)` })
    .from(authAttempts)
    .where(and(eq(authAttempts.bucket, bucket), gt(authAttempts.createdAt, since)))
  return row?.total ?? 0
}

export const purgeExpiredAuth = async (d1: AnyD1Database, now: number, attemptsSince: number) => {
  const db = drizzle(d1)
  await db.delete(loginTokens).where(lt(loginTokens.expiresAt, now))
  await db.delete(sessions).where(lt(sessions.expiresAt, now))
  await db.delete(authAttempts).where(lt(authAttempts.createdAt, attemptsSince))
}
