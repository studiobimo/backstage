import { createContext, useContext } from 'react'

import { LOCALE, type Locale } from '../locales.ts'
import type { Snapshot } from '../publishing.ts'
import { isBlank } from '../translations.ts'

export interface RenderContext {
  locale: Locale
  defaultLocale: Locale
  media: Snapshot['media']
}

const RenderReactContext = createContext<RenderContext>({
  locale: LOCALE.default.defaultLocale,
  defaultLocale: LOCALE.default.defaultLocale,
  media: {}
})

export const RenderProvider = RenderReactContext.Provider

export const useLocale = () => useContext(RenderReactContext).locale

export function useLocalized<T>(translations: Partial<Record<string, T>> | undefined) {
  const { locale, defaultLocale } = useContext(RenderReactContext)
  const own = translations?.[locale]
  return isBlank(own) ? translations?.[defaultLocale] : own
}

export interface RenderedImage {
  src: string
  width: number
  height: number
  alt: string
}

export function useImage(image: { id: string; alt: string } | undefined): RenderedImage | null {
  const { media } = useContext(RenderReactContext)
  const found = image && media[image.id]
  if (!found) return null
  return {
    src: `/${found.key}`,
    width: found.width,
    height: found.height,
    alt: image.alt || found.alt
  }
}
