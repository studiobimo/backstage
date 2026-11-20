export const SEATS_ROUTE = {
  path: { list: '/api/seats', byKey: '/api/seats/:key' },
  query: { zone: 'zone' },
  limit: 50
} as const
