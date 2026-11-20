export const FORM_ROUTE = {
  path: '/forms/:name',
  statusPath: '/forms/:name/status/:token',
  projectionPath: '/forms/:name/projection',
  param: { name: 'name', token: 'token' },
  status: { created: 201 },
  limiter: 'FORM_LIMITER'
} as const

export const formPathOf = (name: string) => FORM_ROUTE.path.replace(':name', name)

export const formStatusPathOf = (name: string, token: string) =>
  FORM_ROUTE.statusPath.replace(':name', name).replace(':token', token)

export const formProjectionPathOf = (name: string) =>
  FORM_ROUTE.projectionPath.replace(':name', name)

export const SLOTS_ROUTE = {
  path: '/api/slots/:resource',
  query: { date: 'date', duration: 'duration' }
} as const

export const slotsPathOf = (resource: string) => SLOTS_ROUTE.path.replace(':resource', resource)
