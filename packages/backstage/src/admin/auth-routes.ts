import type { Context } from 'hono'
import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { createMiddleware } from 'hono/factory'

import { AUTH, requestLinkSchema, verifyLinkSchema, type AuthSessionResponse } from '../auth.ts'
import {
  consumeLoginToken,
  countAttempts,
  findUserByEmail,
  purgeExpiredAuth,
  recordAttempt,
  storeLoginToken
} from '../db/auth.ts'
import { API_ERROR } from '../errors.ts'
import { reportError } from '../observability.ts'
import { randomToken, sha256Hex } from './auth-tokens.ts'
import { resolveAccess, resolveAuthMode, type AccessEnv } from './auth.ts'
import type { LoginMailer } from './mailer.ts'
import { readJsonBody, respondWithError, RESPONSE_STATUS } from './respond.ts'
import { endSession, startSession } from './session.ts'

const clientIp = (c: Context) => c.req.header(AUTH.rateLimit.ipHeader) ?? AUTH.rateLimit.unknownIp

const withinRateLimit = async (db: D1Database, email: string, ip: string, now: number) => {
  const limits = [
    { bucket: `email:${await sha256Hex(email)}`, max: AUTH.rateLimit.perEmail },
    { bucket: `ip:${ip}`, max: AUTH.rateLimit.perIp }
  ]
  const since = now - AUTH.rateLimit.windowMs
  const counts = await Promise.all(
    limits.map(async ({ bucket }) => {
      await recordAttempt(db, bucket, now)
      return countAttempts(db, bucket, since)
    })
  )
  return limits.every(({ max }, index) => counts[index]! <= max)
}

const loginLink = (c: Context, token: string) => {
  const url = new URL(AUTH.signInPath, c.req.url)
  url.searchParams.set(AUTH.tokenParam, token)
  return url.toString()
}

const issueLoginLink = async (c: Context<AccessEnv>, mailer: LoginMailer, email: string) => {
  try {
    const token = randomToken(AUTH.token.bytes)
    await storeLoginToken(c.env.DB, {
      tokenHash: await sha256Hex(token),
      email,
      expiresAt: Date.now() + AUTH.token.ttlMs
    })
    await mailer.sendLoginLink({ to: email, link: loginLink(c, token) }, c.env)
  } catch (error) {
    reportError(c, error)
  }
}

const inBackground = async (c: Context, work: Promise<void>) => {
  try {
    c.executionCtx.waitUntil(work)
  } catch {
    await work
  }
}

const requireMagicLinkMode = createMiddleware<AccessEnv>(async (c, next) => {
  if (resolveAuthMode(c.env.AUTH_MODE) === AUTH.mode.magicLink) return next()
  return respondWithError(c, API_ERROR.notFound)
})

const sessionRoute = async (c: Context<AccessEnv>) => {
  const access = await resolveAccess(c)
  if ('denied' in access && access.denied.status >= API_ERROR.internal.status) {
    return respondWithError(c, access.denied)
  }
  const mode = resolveAuthMode(c.env.AUTH_MODE) ?? AUTH.mode.access
  const body: AuthSessionResponse = { mode, authenticated: 'editor' in access }
  return c.json(body)
}

export const authRoutes = (mailer: LoginMailer) =>
  new Hono<AccessEnv>()
    .use(csrf())
    .get(AUTH.paths.session, sessionRoute)
    .post(AUTH.paths.requestLink, requireMagicLinkMode, async (c) => {
      const body = await readJsonBody(c, requestLinkSchema)
      if (!body.ok) return body.response
      const { email } = body.data
      const now = Date.now()
      await purgeExpiredAuth(c.env.DB, now, now - AUTH.rateLimit.windowMs)
      if (!(await withinRateLimit(c.env.DB, email, clientIp(c), now))) {
        return respondWithError(c, API_ERROR.tooManyRequests)
      }
      if (await findUserByEmail(c.env.DB, email)) {
        await inBackground(c, issueLoginLink(c, mailer, email))
      }
      return c.body(null, RESPONSE_STATUS.accepted)
    })
    .post(AUTH.paths.verify, requireMagicLinkMode, async (c) => {
      const body = await readJsonBody(c, verifyLinkSchema)
      if (!body.ok) return body.response
      const email = await consumeLoginToken(c.env.DB, await sha256Hex(body.data.token), Date.now())
      const user = email && (await findUserByEmail(c.env.DB, email))
      if (!user) return respondWithError(c, API_ERROR.invalidLoginLink)
      await startSession(c, c.env.DB, user.id)
      return c.body(null, RESPONSE_STATUS.noContent)
    })
    .post(AUTH.paths.logout, requireMagicLinkMode, async (c) => {
      await endSession(c, c.env.DB)
      return c.body(null, RESPONSE_STATUS.noContent)
    })
