import { API_ERROR, type ApiError } from '../errors.ts'
import { AUTH, authModeSchema, type AuthMode } from '../auth.ts'
import { logEvent } from '../observability.ts'
import type { Editor } from '../db/users.ts'
import { createMiddleware } from 'hono/factory'
import { verifyWithJwks } from 'hono/jwt'
import type { Context } from 'hono'

import { respondWithError } from './respond.ts'
import type { AdminEnv } from './env.ts'
import { sessionEditor } from './session.ts'

const ACCESS = {
  header: 'Cf-Access-Jwt-Assertion',
  certsPath: '/cdn-cgi/access/certs',
  algorithms: ['RS256'],
  certsCacheSeconds: 300,
  localHostnames: ['localhost', '127.0.0.1', '[::1]'],
  devAuthValue: 'true',
  devEditor: { email: 'dev@localhost', name: 'Local developer' }
} as const

export interface AccessEnv {
  Bindings: AdminEnv
  Variables: { editor: Editor }
}

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '')

const isLocalRequest = (url: string) =>
  (ACCESS.localHostnames as readonly string[]).includes(new URL(url).hostname)

const editorOf = (claims: Record<string, unknown>): Editor => ({
  email: String(claims.email ?? claims.common_name ?? claims.sub),
  name: typeof claims.name === 'string' ? claims.name : ''
})

const verifiedEditor = async (token: string, teamDomain: string, audience: string) => {
  const issuer = trimTrailingSlashes(teamDomain)
  try {
    const claims = await verifyWithJwks(
      token,
      {
        jwks_uri: `${issuer}${ACCESS.certsPath}`,
        allowedAlgorithms: ACCESS.algorithms,
        verification: { iss: issuer, aud: audience }
      },
      { cf: { cacheEverything: true, cacheTtl: ACCESS.certsCacheSeconds } }
    )
    return editorOf(claims)
  } catch {
    return null
  }
}

export const resolveAuthMode = (value: string | undefined): AuthMode | null => {
  if (!value) return AUTH.mode.access
  const parsed = authModeSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

const accessEditor = (c: Context<AccessEnv>) => {
  const { ACCESS_TEAM_DOMAIN, ACCESS_AUD } = c.env
  const token = c.req.header(ACCESS.header)
  return token && ACCESS_TEAM_DOMAIN && ACCESS_AUD
    ? verifiedEditor(token, ACCESS_TEAM_DOMAIN, ACCESS_AUD)
    : null
}

export type Access = { editor: Editor } | { denied: ApiError }

const denial = (c: Context<AccessEnv>, error: ApiError): Access => {
  if (error === API_ERROR.devAuthOutsideLocal || error === API_ERROR.internal) {
    logEvent('error', c, error.message)
  }
  return { denied: error }
}

export const resolveAccess = async (c: Context<AccessEnv>): Promise<Access> => {
  if (c.env.DEV_AUTH === ACCESS.devAuthValue) {
    return isLocalRequest(c.req.url)
      ? { editor: ACCESS.devEditor }
      : denial(c, API_ERROR.devAuthOutsideLocal)
  }
  const mode = resolveAuthMode(c.env.AUTH_MODE)
  if (!mode) return denial(c, API_ERROR.internal)
  const magicLink = mode === AUTH.mode.magicLink
  const editor = await (magicLink ? sessionEditor(c, c.env.DB) : accessEditor(c))
  if (editor) return { editor }
  return { denied: magicLink ? API_ERROR.unauthorized : API_ERROR.forbidden }
}

export const requireAccess = createMiddleware<AccessEnv>(async (c, next) => {
  const access = await resolveAccess(c)
  if ('denied' in access) return respondWithError(c, access.denied)
  c.set('editor', access.editor)
  return next()
})
