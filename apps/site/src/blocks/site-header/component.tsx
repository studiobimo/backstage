import type { z } from 'zod'

import { PRIMARY_NAV_LABEL } from '../outline.ts'
import { type LinkValue, type Translated, useLocalizer } from '../content.ts'
import { LocalizedLink, LinkList } from '../parts.tsx'
import type { siteHeaderSchema } from './schema.ts'

export function SiteHeader({ navigation, cta }: z.output<typeof siteHeaderSchema>) {
  const localize = useLocalizer()
  const hasLink = (value: Translated<LinkValue> | undefined) => Boolean(localize(value)?.href)
  const items = navigation.filter(({ link, dropdown }) => hasLink(link) || dropdown.some(hasLink))
  if (items.length === 0 && !hasLink(cta)) return null
  return (
    <header>
      {items.length > 0 ? (
        <nav aria-label={localize(PRIMARY_NAV_LABEL)}>
          <ul>
            {items.map((item, index) => (
              <li key={index}>
                <LocalizedLink value={item.link} />
                <LinkList links={item.dropdown} />
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <LocalizedLink value={cta} />
    </header>
  )
}
