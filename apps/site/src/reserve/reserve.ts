export const RESERVE = {
  path: '/reserve',
  availabilityPath: '/reserve/availability',
  entry: 'src/reserve/main.tsx',
  mountId: 'reserve-root',
  title: 'Reserve',
  locale: 'en',
  seatsFree: 12,
  contentSecurityPolicy: { scriptSrc: ["'self'"], connectSrc: ["'self'"] }
} as const

export interface Availability {
  seats: number
}
