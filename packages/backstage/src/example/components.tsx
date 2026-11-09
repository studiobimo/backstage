import type { z } from 'zod'

import type { LayoutProps } from '../blocks.ts'
import type { link } from '../fields.ts'
import { useImage, useLocalized } from '../render/context.ts'
import { RichText } from '../render/rich-text.tsx'
import { SLOT } from '../blocks.ts'
import type { heroSchema, siteFooterSchema, siteHeaderSchema } from './schemas.ts'

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

export function Hero({ title, body, cta, picture, theme }: z.output<typeof heroSchema>) {
  return (
    <section data-theme={theme}>
      <h1>
        <Translation value={title} />
      </h1>
      <RichText doc={useLocalized(body)} />
      {cta.href ? <a href={cta.href}>{cta.label || cta.href}</a> : null}
      <Picture value={picture} />
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
