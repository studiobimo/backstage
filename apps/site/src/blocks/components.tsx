import { type LayoutProps, type link, type RichTextDoc, SLOT } from '@studiobimo/backstage'
import { RichText, useImage, useLocalized } from '@studiobimo/backstage/render'
import type { z } from 'zod'

import type { oneColumnSectionSchema } from './one-column-section/schema.ts'
import type { oneColumnTextSchema } from './one-column-text/schema.ts'
import type { overlayHeroSchema } from './overlay-hero/schema.ts'
import type { siteFooterSchema } from './site-footer/schema.ts'
import type { siteHeaderSchema } from './site-header/schema.ts'
import type { splitHeroSchema } from './split-hero/schema.ts'
import type { twoColumnSectionSchema } from './two-column-section/schema.ts'
import type { twoColumnTextSchema } from './two-column-text/schema.ts'

type LinkValue = z.output<ReturnType<typeof link>>
type Translated<T> = Partial<Record<string, T>>

function LocalizedLink({ value }: { value: Translated<LinkValue> | undefined }) {
  const target = useLocalized(value)
  return target ? <a href={target.href}>{target.label || target.href}</a> : null
}

function Picture({ value }: { value: { id: string; alt: string } | undefined }) {
  const picture = useImage(value)
  return picture ? (
    <img src={picture.src} width={picture.width} height={picture.height} alt={picture.alt} />
  ) : null
}

function Translation({ value }: { value: Translated<string> | undefined }) {
  return <>{useLocalized(value)}</>
}

function Heading({ value }: { value: Translated<string> | undefined }) {
  const text = useLocalized(value)
  return text ? <h2>{text}</h2> : null
}

function Cta({ value }: { value: LinkValue | undefined }) {
  return value?.href ? <a href={value.href}>{value.label || value.href}</a> : null
}

function Body({ value }: { value: Translated<RichTextDoc> | undefined }) {
  return <RichText doc={useLocalized(value)} />
}

export function OverlayHero({
  title,
  body,
  cta,
  background,
  tint,
  align
}: z.output<typeof overlayHeroSchema>) {
  return (
    <section data-block="overlay-hero" data-tint={tint} data-align={align}>
      <Picture value={background} />
      <div>
        <h1>
          <Translation value={title} />
        </h1>
        <Body value={body} />
        <Cta value={cta} />
      </div>
    </section>
  )
}

export function SplitHero({
  title,
  body,
  cta,
  picture,
  theme,
  imageSide
}: z.output<typeof splitHeroSchema>) {
  return (
    <section data-block="split-hero" data-theme={theme} data-image-side={imageSide}>
      <div>
        <h1>
          <Translation value={title} />
        </h1>
        <Body value={body} />
        <Cta value={cta} />
      </div>
      <Picture value={picture} />
    </section>
  )
}

export function OneColumnSection({
  heading,
  body,
  picture,
  cta,
  background,
  spacing
}: z.output<typeof oneColumnSectionSchema>) {
  return (
    <section data-block="one-column-section" data-background={background} data-spacing={spacing}>
      <Heading value={heading} />
      <Body value={body} />
      <Picture value={picture} />
      <Cta value={cta} />
    </section>
  )
}

export function OneColumnText({ heading, body, width }: z.output<typeof oneColumnTextSchema>) {
  return (
    <section data-block="one-column-text" data-width={width}>
      <Heading value={heading} />
      <Body value={body} />
    </section>
  )
}

type SectionColumnValue = z.output<typeof twoColumnSectionSchema>['left']

function SectionColumn({ heading, body, picture, cta }: SectionColumnValue) {
  return (
    <div data-column>
      <Heading value={heading} />
      <Body value={body} />
      <Picture value={picture} />
      <Cta value={cta} />
    </div>
  )
}

export function TwoColumnSection({
  left,
  right,
  split,
  background,
  spacing
}: z.output<typeof twoColumnSectionSchema>) {
  return (
    <section
      data-block="two-column-section"
      data-split={split}
      data-background={background}
      data-spacing={spacing}
    >
      <SectionColumn {...left} />
      <SectionColumn {...right} />
    </section>
  )
}

export function TwoColumnText({ left, right }: z.output<typeof twoColumnTextSchema>) {
  return (
    <section data-block="two-column-text">
      {[left, right].map((column, index) => (
        <div key={index} data-column>
          <Heading value={column.heading} />
          <Body value={column.body} />
        </div>
      ))}
    </section>
  )
}

function LinkList({ links }: { links: Translated<LinkValue>[] }) {
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

export function SiteHeader({ navigation, cta }: z.output<typeof siteHeaderSchema>) {
  return (
    <header>
      <nav>
        <ul>
          {navigation.map((item, index) => (
            <li key={index}>
              <LocalizedLink value={item.link} />
              {item.dropdown.length > 0 ? <LinkList links={item.dropdown} /> : null}
            </li>
          ))}
        </ul>
      </nav>
      <LocalizedLink value={cta} />
    </header>
  )
}

export function SiteFooter({ logo, text, columns, contact }: z.output<typeof siteFooterSchema>) {
  return (
    <footer>
      <Picture value={logo} />
      <p>
        <Translation value={text} />
      </p>
      {columns.map((column, index) => (
        <section key={index}>
          <h2>
            <Translation value={column.heading} />
          </h2>
          <LinkList links={column.links} />
        </section>
      ))}
      {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}
      {contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : null}
      <address>
        <Translation value={contact.address} />
      </address>
    </footer>
  )
}

export function DefaultLayout({ slots, children }: LayoutProps) {
  return (
    <>
      {slots[SLOT.header]}
      <main>{children}</main>
      {slots[SLOT.footer]}
    </>
  )
}

export function MinimalLayout({ slots, children }: LayoutProps) {
  return (
    <>
      {slots[SLOT.header]}
      <main>{children}</main>
    </>
  )
}

export function BareLayout({ children }: LayoutProps) {
  return <main>{children}</main>
}
