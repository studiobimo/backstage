import { isBlank, type RichTextDoc } from '@studiobimo/backstage'
import { RichText, useImage, useLocalized } from '@studiobimo/backstage/render'
import { Button } from '@/components/ui/button'

import { type LinkValue, type Translated, useVisibleLinks } from './content.ts'
import { HEADING_LEVEL } from './outline.ts'

export function LocalizedLink({ value }: { value: Translated<LinkValue> | undefined }) {
  const target = useLocalized(value)
  return target?.href ? <a href={target.href}>{target.label || target.href}</a> : null
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

const nestHeadings = (doc: RichTextDoc): RichTextDoc => ({
  ...doc,
  content: doc.content.map((node) =>
    node.type === 'heading' ? { ...node, attrs: { level: HEADING_LEVEL.content } } : node
  )
})

export function Body({ value }: { value: Translated<RichTextDoc> | undefined }) {
  const doc = useLocalized(value)
  return doc && !isBlank(doc) ? <RichText doc={nestHeadings(doc)} /> : null
}

export function LinkList({ links }: { links: Translated<LinkValue>[] }) {
  const visible = useVisibleLinks(links)
  return visible.length > 0 ? (
    <ul>
      {visible.map((value, index) => (
        <li key={index}>
          <LocalizedLink value={value} />
        </li>
      ))}
    </ul>
  ) : null
}
