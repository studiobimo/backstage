import { z } from 'zod'

const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS
const DAY_MS = 24 * 60 * MINUTE_MS
const TOKEN_TTL_MINUTES = 15

export const AUTH = {
  mode: { access: 'access', magicLink: 'magic-link' },
  paths: {
    base: '/auth',
    session: '/session',
    requestLink: '/request-link',
    verify: '/verify',
    logout: '/logout'
  },
  signInPath: '/sign-in',
  signOut: { session: 'session', access: 'access', none: 'none' },
  accessLogoutPath: '/cdn-cgi/access/logout',
  tokenParam: 'token',
  token: {
    bytes: 32,
    maxLength: 256,
    ttlMinutes: TOKEN_TTL_MINUTES,
    ttlMs: TOKEN_TTL_MINUTES * MINUTE_MS
  },
  session: { bytes: 32, ttlMs: 14 * DAY_MS },
  cookie: { name: 'backstage_session', sameSite: 'Lax' },
  rateLimit: {
    windowMs: 15 * MINUTE_MS,
    perEmail: 3,
    perIp: 10,
    unknownIp: 'unknown',
    ipHeader: 'CF-Connecting-IP'
  },
  email: {
    subject: 'Your sign-in link',
    intro: `Use this link to sign in. It works once and expires in ${TOKEN_TTL_MINUTES} minutes.`,
    ignore: 'If you did not ask for it, you can ignore this email.'
  },
  emailMaxLength: 254
} as const

export const authModeSchema = z.enum([AUTH.mode.access, AUTH.mode.magicLink])
export type AuthMode = z.infer<typeof authModeSchema>

const signOutKindSchema = z.enum([AUTH.signOut.session, AUTH.signOut.access, AUTH.signOut.none])
export type SignOutKind = z.infer<typeof signOutKindSchema>

export const authSessionResponseSchema = z.object({
  mode: authModeSchema,
  authenticated: z.boolean(),
  signOut: signOutKindSchema
})
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>

export const emailSchema = z.string().trim().toLowerCase().max(AUTH.emailMaxLength).pipe(z.email())

export const requestLinkSchema = z.object({ email: emailSchema })
export type RequestLinkInput = z.input<typeof requestLinkSchema>

export const verifyLinkSchema = z.object({ token: z.string().min(1).max(AUTH.token.maxLength) })
