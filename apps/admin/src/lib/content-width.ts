export const CONTENT_WIDTH = {
  wide: 'max-w-6xl',
  narrow: 'max-w-4xl'
} as const

export const CONTROL_WIDTH = {
  compact: 'w-full sm:w-44',
  action: 'sm:w-24',
  rowAction: 'sm:min-w-31'
} as const

export type ContentWidth = keyof typeof CONTENT_WIDTH

export const DEFAULT_CONTENT_WIDTH: ContentWidth = 'narrow'

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    width?: ContentWidth
  }
}
