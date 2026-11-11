import type { link, RichTextDoc } from '@studiobimo/backstage'
import { RichText, useImage, useLocalized } from '@studiobimo/backstage/render'
import type { z } from 'zod'

import { Button } from '@/components/ui/button'

export type LinkValue = z.output<ReturnType<typeof link>>
export type Translated<T> = Partial<Record<string, T>>

export function LocalizedLink({ value }: { value: Translated<LinkValue> | undefined }) {
  const target = useLocalized(value)
  return target ? <a href={target.href}>{target.label || target.href}</a> : null
}

export function Picture({ value }: { value: { id: string; alt: string } | undefined }) {
  const picture = useImage(value)
  return picture ? (
    <img src={picture.src} width={picture.width} height={picture.height} alt={picture.alt} />
  ) : null
}

export function Translation({ value }: { value: Translated<string> | undefined }) {
  return <>{useLocalized(value)}</>
}

export function Heading({ value }: { value: Translated<string> | undefined }) {
  const text = useLocalized(value)
  return text ? <h2>{text}</h2> : null
}

export function Cta({ value }: { value: LinkValue | undefined }) {
  return value?.href ? (
    <Button
      render={({ children, ...props }) => (
        <a {...props} href={value.href}>
          {children}
        </a>
      )}
    >
      {value.label || value.href}
    </Button>
  ) : null
}

export function Body({ value }: { value: Translated<RichTextDoc> | undefined }) {
  return <RichText doc={useLocalized(value)} />
}

export function LinkList({ links }: { links: Translated<LinkValue>[] }) {
  return (
    <ul>
      {links.map((value, index) => (
        <li key={index}>
          <LocalizedLink value={value} />
        </li>
      ))}
    </ul>
  )
}
