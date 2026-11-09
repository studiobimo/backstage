export const API_ERROR = {
  forbidden: { code: 'forbidden', status: 403, message: 'Forbidden' },
  invalid: { code: 'invalid', status: 400, message: 'Invalid input' },
  slugTaken: { code: 'slug_taken', status: 409, message: 'That slug is already used' },
  homeTaken: { code: 'home_taken', status: 409, message: 'The home page already exists' },
  staleVersion: {
    code: 'stale_version',
    status: 409,
    message: 'A newer version of this page was saved'
  },
  tooLarge: { code: 'too_large', status: 413, message: 'The image is too large' },
  unsupportedMedia: {
    code: 'unsupported_media',
    status: 415,
    message: 'Only JPEG, PNG, WebP and AVIF images are accepted'
  },
  notFound: { code: 'not_found', status: 404, message: 'Not found' },
  internal: { code: 'internal', status: 500, message: 'Internal error' },
  devAuthOutsideLocal: {
    code: 'dev_auth_outside_local',
    status: 500,
    message: 'DEV_AUTH is set on a deployed worker'
  }
} as const

export type ApiError = (typeof API_ERROR)[keyof typeof API_ERROR]

export const errorBody = ({ code, message }: ApiError) => ({ error: message, code })
