import {
  DEFAULT_LOCALE,
  LAYOUT,
  type ComponentMap,
  type LayoutProps,
  type Snapshot
} from '@studiobimo/backstage'
import { Blocks, RenderProvider } from '@studiobimo/backstage/render'
import { createElement } from 'react'

import { LOCALE_NAME, SWITCHER_LABEL } from './locales'
import { pathOf } from './routing'
import { STYLESHEET } from './stylesheet'

export interface PageProps {
  components: ComponentMap
  snapshot: Snapshot
  translations: readonly Snapshot[]
  origin: string
}

function FallbackLayout({ children }: LayoutProps) {
  return <main>{children}</main>
}

function LanguageSwitcher({ snapshot, translations }: Omit<PageProps, 'components' | 'origin'>) {
  const pages = [snapshot, ...translations].sort(
    (a, b) => Number(b.locale === DEFAULT_LOCALE) - Number(a.locale === DEFAULT_LOCALE)
  )
  return (
    <nav aria-label={SWITCHER_LABEL[snapshot.locale]}>
      <ul>
        {pages.map(({ locale, slug }) => (
          <li key={locale}>
            <a
              href={pathOf({ locale, slug })}
              hrefLang={locale}
              lang={locale}
              aria-current={locale === snapshot.locale ? 'page' : undefined}
            >
              {LOCALE_NAME[locale]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Head({ snapshot, translations, origin }: Omit<PageProps, 'components'>) {
  const title = snapshot.seo.title || snapshot.title
  const socialImage = snapshot.seo.socialImageId && snapshot.media[snapshot.seo.socialImageId]
  return (
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <link rel="stylesheet" href={STYLESHEET.path} />
      {snapshot.seo.description ? (
        <meta name="description" content={snapshot.seo.description} />
      ) : null}
      <link rel="canonical" href={origin + pathOf(snapshot)} />
      {[snapshot, ...translations].map(({ locale, slug }) => (
        <link
          key={locale}
          rel="alternate"
          hrefLang={locale}
          href={origin + pathOf({ locale, slug })}
        />
      ))}
      <meta property="og:title" content={title} />
      {socialImage ? <meta property="og:image" content={`${origin}/${socialImage.key}`} /> : null}
    </head>
  )
}

export function Document(props: PageProps) {
  const { components, snapshot, translations } = props
  const layoutComponent =
    components.layouts[snapshot.layout] ?? components.layouts[LAYOUT.default] ?? FallbackLayout
  return (
    <html lang={snapshot.locale}>
      <Head {...props} />
      <body>
        <RenderProvider
          value={{ locale: snapshot.locale, defaultLocale: DEFAULT_LOCALE, media: snapshot.media }}
        >
          {createElement(layoutComponent, {
            slots: {},
            children: <Blocks components={components} snapshot={snapshot} />
          })}
        </RenderProvider>
        <LanguageSwitcher snapshot={snapshot} translations={translations} />
      </body>
    </html>
  )
}
