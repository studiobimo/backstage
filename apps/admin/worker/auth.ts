import { API_ERROR, logEvent } from '@studiobimo/backstage'
import { createMiddleware } from 'hono/factory'
import { verifyWithJwks } from 'hono/jwt'

import { respondWithError } from './respond'

const ACCESS = {
  header: 'Cf-Access-Jwt-Assertion',
  certsPath: '/cdn-cgi/access/certs',
  algorithms: ['RS256'],
  certsCacheSeconds: 300,
  localHostnames: ['localhost', '127.0.0.1', '[::1]']
} as const

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '')

const isLocalRequest = (url: string) =>
  (ACCESS.localHostnames as readonly string[]).includes(new URL(url).hostname)

const isValidAccessToken = async (token: string, teamDomain: string, audience: string) => {
  const issuer = trimTrailingSlashes(teamDomain)
  try {
    await verifyWithJwks(
      token,
      {
        jwks_uri: `${issuer}${ACCESS.certsPath}`,
        allowedAlgorithms: ACCESS.algorithms,
        verification: { iss: issuer, aud: audience }
      },
      { cf: { cacheEverything: true, cacheTtl: ACCESS.certsCacheSeconds } }
    )
    return true
  } catch {
    return false
  }
}

export const requireAccess = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const { DEV_AUTH, ACCESS_TEAM_DOMAIN, ACCESS_AUD } = c.env

  if (DEV_AUTH) {
    if (!isLocalRequest(c.req.url)) {
      logEvent('error', c, API_ERROR.devAuthOutsideLocal.message)
      return respondWithError(c, API_ERROR.devAuthOutsideLocal)
    }
    return next()
  }

  const token = c.req.header(ACCESS.header)
  if (
    !token ||
    !ACCESS_TEAM_DOMAIN ||
    !ACCESS_AUD ||
    !(await isValidAccessToken(token, ACCESS_TEAM_DOMAIN, ACCESS_AUD))
  ) {
    return respondWithError(c, API_ERROR.forbidden)
  }
  return next()
})
