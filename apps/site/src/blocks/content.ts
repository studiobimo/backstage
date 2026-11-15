import { isBlank, type link, type RichTextDoc } from '@studiobimo/backstage'
import { useDefaultLocale, useImage, useLocale } from '@studiobimo/backstage/render'
import type { z } from 'zod'

export type LinkValue = z.output<ReturnType<typeof link>>
export type Translated<T> = Partial<Record<string, T>>

export function useLocalizer() {
  const locale = useLocale()
  const defaultLocale = useDefaultLocale()
  return <T>(translations: Translated<T> | undefined) => {
    const own = translations?.[locale]
    return isBlank(own) ? translations?.[defaultLocale] : own
  }
}

interface ContentFields {
  heading?: Translated<string>
  body?: Translated<RichTextDoc>
  picture?: { id: string; alt: string }
  cta?: Translated<LinkValue>
}

export function useHasContent({ heading, body, picture, cta }: ContentFields) {
  const localize = useLocalizer()
  const image = useImage(picture)
  return (
    Boolean(localize(heading)) ||
    !isBlank(localize(body)) ||
    image !== null ||
    Boolean(localize(cta)?.href)
  )
}

export function useVisibleLinks(links: Translated<LinkValue>[]) {
  const localize = useLocalizer()
  return links.filter((value) => Boolean(localize(value)?.href))
}
