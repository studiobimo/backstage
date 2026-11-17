import { API_ERROR, type ApiError } from '../errors.ts'
import { AUTH, authModeSchema, type AuthMode, type SignOutKind } from '../auth.ts'
import { logEvent } from '../observability.ts'
import {
  claimOrResolveUser,
  ownerEmailsOf,
  resolveUser,
  setUserName,
  type Editor,
  type Identity
} from '../db/users.ts'
import { ROLE } from '../users.ts'
import { createMiddleware } from 'hono/factory'
import { verifyWithJwks } from 'hono/jwt'
import type { Context } from 'hono'

import { respondWithError } from './respond.ts'
import type { AdminEnv } from './env.ts'
import { sessionEditor } from './session.ts'

const ACCESS = {
  header: 'Cf-Access-Jwt-Assertion',
  certsPath: '/cdn-cgi/access/certs',
  identityPath: '/cdn-cgi/access/get-identity',
  cookie: 'CF_Authorization',
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

const identityOf = (claims: Record<string, unknown>): Identity => ({
  email: String(claims.email ?? claims.common_name ?? claims.sub),
  name: typeof claims.name === 'string' ? claims.name : ''
})

const verifiedIdentity = async (token: string, teamDomain: string, audience: string) => {
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
    return identityOf(claims)
  } catch {
    return null
  }
}

export const resolveAuthMode = (value: string | undefined): AuthMode | null => {
  if (!value) return AUTH.mode.access
  const parsed = authModeSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

const accessEditor = async (c: Context<AccessEnv>) => {
  const { ACCESS_TEAM_DOMAIN, ACCESS_AUD, DB, OWNER_EMAIL } = c.env
  const token = c.req.header(ACCESS.header)
  if (!token || !ACCESS_TEAM_DOMAIN || !ACCESS_AUD) return null
  const identity = await verifiedIdentity(token, ACCESS_TEAM_DOMAIN, ACCESS_AUD)
  return identity && claimOrResolveUser(DB, identity, ownerEmailsOf(OWNER_EMAIL))
}

const accessIdentityName = async (teamDomain: string, token: string) => {
  try {
    const response = await fetch(`${trimTrailingSlashes(teamDomain)}${ACCESS.identityPath}`, {
      headers: { cookie: `${ACCESS.cookie}=${token}` }
    })
    const body: { name?: unknown } = await response.json()
    return typeof body.name === 'string' ? body.name.trim() : ''
  } catch {
    return ''
  }
}

export const withAccessName = async (c: Context<AccessEnv>): Promise<Editor> => {
  const editor = c.get('editor')
  const token = c.req.header(ACCESS.header)
  const { ACCESS_TEAM_DOMAIN, DB } = c.env
  if (editor.name || !token || !ACCESS_TEAM_DOMAIN) return editor
  const name = await accessIdentityName(ACCESS_TEAM_DOMAIN, token)
  if (!name) return editor
  await setUserName(DB, editor.id, name)
  return { ...editor, name }
}

export const signOutKind = (c: Context<AccessEnv>, mode: AuthMode): SignOutKind => {
  if (mode === AUTH.mode.magicLink) return AUTH.signOut.session
  return c.env.DEV_AUTH === ACCESS.devAuthValue ? AUTH.signOut.none : AUTH.signOut.access
}

export const requireOwner = createMiddleware<AccessEnv>(async (c, next) =>
  c.get('editor').role === ROLE.owner ? next() : respondWithError(c, API_ERROR.forbidden)
)

export type Access = { editor: Editor } | { denied: ApiError }

const denial = (c: Context<AccessEnv>, error: ApiError): Access => {
  if (error === API_ERROR.devAuthOutsideLocal || error === API_ERROR.internal) {
    logEvent('error', c, error.message)
  }
  return { denied: error }
}

const devAccess = async (c: Context<AccessEnv>): Promise<Access> => {
  const editor = await resolveUser(c.env.DB, ACCESS.devEditor, [ACCESS.devEditor.email])
  return editor ? { editor } : denial(c, API_ERROR.internal)
}

export const resolveAccess = async (c: Context<AccessEnv>): Promise<Access> => {
  if (c.env.DEV_AUTH === ACCESS.devAuthValue) {
    return isLocalRequest(c.req.url) ? devAccess(c) : denial(c, API_ERROR.devAuthOutsideLocal)
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
