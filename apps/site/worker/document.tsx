import {
  DEFAULT_LOCALE,
  LAYOUT,
  validateBlockContent,
  type ComponentMap,
  type LayoutProps,
  type Registry,
  type Snapshot
} from '@studiobimo/backstage'
import { RenderProvider } from '@studiobimo/backstage/render'
import { type ComponentType, createElement } from 'react'

import { LOCALE_NAME, SWITCHER_LABEL } from './locales'
import { pathOf } from './routing'

export interface PageProps {
  registry: Registry
  components: ComponentMap
  snapshot: Snapshot
  translations: readonly Snapshot[]
  origin: string
}

function FallbackLayout({ children }: LayoutProps) {
  return <main>{children}</main>
}

function Blocks({
  registry,
  components,
  snapshot
}: Pick<PageProps, 'registry' | 'components' | 'snapshot'>) {
  return snapshot.blocks.flatMap((block) => {
    const definition = registry.get(block.block)
    if (!definition || registry.isSlotBlock(block.block)) return []
    const result = validateBlockContent(definition, block.schemaVersion, block.content)
    if (!result.ok) return []
    const Component = components.blocks[definition.name] as
      ComponentType<Record<string, unknown>> | undefined
    if (!Component) return []
    return [<Component key={block.id} {...(result.content as Record<string, unknown>)} />]
  })
}

function LanguageSwitcher({
  snapshot,
  translations
}: Omit<PageProps, 'registry' | 'components' | 'origin'>) {
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

function Head({ snapshot, translations, origin }: Omit<PageProps, 'registry' | 'components'>) {
  const title = snapshot.seo.title || snapshot.title
  const socialImage = snapshot.seo.socialImageId && snapshot.media[snapshot.seo.socialImageId]
  return (
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
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
  const { registry, components, snapshot, translations } = props
  const layout = registry.layouts.get(snapshot.layout) ?? registry.layouts.get(LAYOUT.default)
  const layoutComponent = (layout && components.layouts[layout.name]) || FallbackLayout
  return (
    <html lang={snapshot.locale}>
      <Head {...props} />
      <body>
        <RenderProvider
          value={{ locale: snapshot.locale, defaultLocale: DEFAULT_LOCALE, media: snapshot.media }}
        >
          {createElement(layoutComponent, {
            slots: {},
            children: <Blocks registry={registry} components={components} snapshot={snapshot} />
          })}
        </RenderProvider>
        <LanguageSwitcher snapshot={snapshot} translations={translations} />
      </body>
    </html>
  )
}
