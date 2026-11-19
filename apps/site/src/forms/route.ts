export const FORM_ROUTE = {
  path: '/forms/:name',
  status: { created: 201 },
  field: { turnstile: 'cf-turnstile-response' }
} as const

export const formPathOf = (name: string) => FORM_ROUTE.path.replace(':name', name)
