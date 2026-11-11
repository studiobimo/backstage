import type { z } from 'zod'

import { Picture, Translation, LinkList } from '../parts.tsx'
import type { siteFooterSchema } from './schema.ts'

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
