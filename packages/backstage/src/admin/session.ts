import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

import { AUTH } from '../auth.ts'
import { createSession, deleteSession, findSessionEditor } from '../db/auth.ts'
import type { Editor } from '../db/users.ts'
import { randomToken, sha256Hex } from './auth-tokens.ts'

const COOKIE_PREFIX = 'host'
const MS_PER_SECOND = 1000

const cookieOptions = () =>
  ({
    prefix: COOKIE_PREFIX,
    httpOnly: true,
    secure: true,
    sameSite: AUTH.cookie.sameSite,
    path: '/'
  }) as const

export const startSession = async (c: Context, db: D1Database, userId: string) => {
  const id = randomToken(AUTH.session.bytes)
  await createSession(db, {
    idHash: await sha256Hex(id),
    userId,
    expiresAt: Date.now() + AUTH.session.ttlMs
  })
  setCookie(c, AUTH.cookie.name, id, {
    ...cookieOptions(),
    maxAge: AUTH.session.ttlMs / MS_PER_SECOND
  })
}

export const sessionEditor = async (c: Context, db: D1Database): Promise<Editor | null> => {
  const id = getCookie(c, AUTH.cookie.name, COOKIE_PREFIX)
  return id ? findSessionEditor(db, await sha256Hex(id), Date.now()) : null
}

export const endSession = async (c: Context, db: D1Database) => {
  const id = getCookie(c, AUTH.cookie.name, COOKIE_PREFIX)
  if (id) await deleteSession(db, await sha256Hex(id))
  deleteCookie(c, AUTH.cookie.name, cookieOptions())
}
