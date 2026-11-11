import type { z } from 'zod'

import { LocalizedLink, LinkList } from '../parts.tsx'
import type { siteHeaderSchema } from './schema.ts'

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
