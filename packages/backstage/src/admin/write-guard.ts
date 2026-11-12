import { createMiddleware } from 'hono/factory'

import { API_ERROR } from '../index.ts'
import { respondWithError } from './respond.ts'

const WRITE_GUARD = {
  bodyMethods: ['POST', 'PUT', 'PATCH'],
  jsonType: 'application/json',
  multipartType: 'multipart/form-data',
  multipartPath: '/api/v1/media'
} as const

const contentTypeOf = (header: string | undefined) =>
  (header ?? '').split(';')[0]!.trim().toLowerCase()

const allowedTypesFor = (path: string): readonly string[] =>
  path === WRITE_GUARD.multipartPath
    ? [WRITE_GUARD.jsonType, WRITE_GUARD.multipartType]
    : [WRITE_GUARD.jsonType]

export const requireJsonWrites = createMiddleware(async (c, next) => {
  const hasBody = (WRITE_GUARD.bodyMethods as readonly string[]).includes(c.req.method)
  if (
    hasBody &&
    !allowedTypesFor(c.req.path).includes(contentTypeOf(c.req.header('content-type')))
  ) {
    return respondWithError(c, API_ERROR.unsupportedContentType)
  }
  return next()
})
