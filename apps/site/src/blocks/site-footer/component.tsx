import { useImage } from '@studiobimo/backstage/render'
import type { z } from 'zod'

import { useLocalizer } from '../content.ts'
import { Heading, LinkList, Picture } from '../parts.tsx'
import type { siteFooterSchema } from './schema.ts'

type FooterColumnValue = z.output<typeof siteFooterSchema>['columns'][number]

function FooterColumn({ heading, links }: FooterColumnValue) {
  return (
    <section>
      <Heading value={heading} />
      <LinkList links={links} />
    </section>
  )
}

export function SiteFooter({ logo, text, columns, contact }: z.output<typeof siteFooterSchema>) {
  const localize = useLocalizer()
  const picture = useImage(logo)
  const message = localize(text)
  const address = localize(contact.address)
  const { email, phone } = contact
  const visibleColumns = columns.filter(
    ({ heading, links }) => Boolean(localize(heading)) || links.some((link) => localize(link)?.href)
  )
  if (!picture && !message && !address && !email && !phone && visibleColumns.length === 0) {
    return null
  }
  return (
    <footer>
      <Picture value={logo} />
      {message ? <p>{message}</p> : null}
      {visibleColumns.map((column, index) => (
        <FooterColumn key={index} {...column} />
      ))}
      {email ? <a href={`mailto:${email}`}>{email}</a> : null}
      {phone ? <a href={`tel:${phone}`}>{phone}</a> : null}
      {address ? <address>{address}</address> : null}
    </footer>
  )
}
