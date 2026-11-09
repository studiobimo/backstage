export const CONTENT_WIDTH = {
  wide: 'max-w-6xl',
  narrow: 'max-w-3xl'
} as const

export type ContentWidth = keyof typeof CONTENT_WIDTH

export const DEFAULT_CONTENT_WIDTH: ContentWidth = 'narrow'

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    width?: ContentWidth
  }
}
