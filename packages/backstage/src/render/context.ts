import { createContext, useContext } from 'react'

import { NO_SITE_BRAND, type SiteBrand } from '../brand.ts'
import { LOCALE, type Locale } from '../locales.ts'
import type { Snapshot } from '../publishing.ts'
import { isBlank } from '../translations.ts'

export interface RenderContext {
  locale: Locale
  defaultLocale: Locale
  media: Snapshot['media']
  brand?: SiteBrand
}

const RenderReactContext = createContext<RenderContext>({
  locale: LOCALE.default.defaultLocale,
  defaultLocale: LOCALE.default.defaultLocale,
  media: {}
})

export const RenderProvider = RenderReactContext.Provider

export const useLocale = () => useContext(RenderReactContext).locale

export const useDefaultLocale = () => useContext(RenderReactContext).defaultLocale

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

export const useBrand = () => useContext(RenderReactContext).brand ?? NO_SITE_BRAND

export const useLogo = () => useImage(useBrand().logo ?? undefined)
