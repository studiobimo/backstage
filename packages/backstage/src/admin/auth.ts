import { API_ERROR } from '../errors.ts'
import { logEvent } from '../observability.ts'
import type { Editor } from '../db/users.ts'
import { createMiddleware } from 'hono/factory'
import { verifyWithJwks } from 'hono/jwt'

import { respondWithError } from './respond.ts'
import type { AdminEnv } from './env.ts'

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

export const requireAccess = createMiddleware<AccessEnv>(async (c, next) => {
  const { DEV_AUTH, ACCESS_TEAM_DOMAIN, ACCESS_AUD } = c.env

  if (DEV_AUTH === ACCESS.devAuthValue) {
    if (!isLocalRequest(c.req.url)) {
      logEvent('error', c, API_ERROR.devAuthOutsideLocal.message)
      return respondWithError(c, API_ERROR.devAuthOutsideLocal)
    }
    c.set('editor', ACCESS.devEditor)
    return next()
  }

  const token = c.req.header(ACCESS.header)
  const editor =
    token && ACCESS_TEAM_DOMAIN && ACCESS_AUD
      ? await verifiedEditor(token, ACCESS_TEAM_DOMAIN, ACCESS_AUD)
      : null
  if (!editor) return respondWithError(c, API_ERROR.forbidden)
  c.set('editor', editor)
  return next()
})
