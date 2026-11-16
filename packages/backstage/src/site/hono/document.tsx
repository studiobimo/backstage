import { createElement, type ReactNode } from 'react'

import { LAYOUT } from '../../blocks.ts'
import type { ComponentMap, LayoutProps } from '../../components.ts'
import { hasMultipleLocales, type LocaleConfig } from '../../locales.ts'
import type { Snapshot } from '../../publishing.ts'
import { Blocks } from '../../render/blocks.tsx'
import { RenderProvider } from '../../render/context.ts'
import { renderSlots } from '../../render/slots.tsx'
import type { SiteSnapshot } from '../../site-publishing.ts'
import { renderHtml } from '../html.ts'
import { localeName, switcherLabel } from '../locales.ts'
import { previewPathOf } from '../../page-preview.ts'
import { pathOf } from '../routing.ts'
import { descriptionOf, documentTitleOf, socialImageOf } from './head.ts'
import { linksOf } from './origin.ts'

export type SiteHead = (snapshot: Snapshot) => ReactNode

export interface DocumentContext {
  components: ComponentMap
  locales: LocaleConfig
  stylesheetPath: string
  head?: SiteHead
}

export interface PageProps extends DocumentContext {
  snapshot: Snapshot
  translations: readonly Snapshot[]
  site: SiteSnapshot | null
  siteOrigin: string
  preview?: { token: string }
}

export type PreviewProps = Pick<PageProps, 'components' | 'locales' | 'snapshot' | 'stylesheetPath'>

function FallbackLayout({ children }: LayoutProps) {
  return <main>{children}</main>
}

function PageContent({ components, snapshot }: Pick<PreviewProps, 'components' | 'snapshot'>) {
  return (
    <>
      <h1 data-page-title>{snapshot.title}</h1>
      <Blocks components={components} snapshot={snapshot} />
    </>
  )
}

function LanguageSwitcher({
  snapshot,
  translations,
  locales,
  preview
}: Pick<PageProps, 'snapshot' | 'translations' | 'locales' | 'preview'>) {
  if (!hasMultipleLocales(locales)) return null
  const pages = [snapshot, ...translations].sort(
    (a, b) =>
      Number(b.locale === locales.defaultLocale) - Number(a.locale === locales.defaultLocale)
  )
  return (
    <nav aria-label={switcherLabel(snapshot.locale)}>
      <ul>
        {pages.map(({ locale, slug }) => (
          <li key={locale}>
            <a
              href={
                preview ? previewPathOf(preview.token, locale) : pathOf({ locale, slug }, locales)
              }
              hrefLang={locale}
              lang={locale}
              aria-current={locale === snapshot.locale ? 'page' : undefined}
            >
              {localeName(locale)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Head({
  snapshot,
  translations,
  siteOrigin,
  site,
  stylesheetPath,
  head,
  locales,
  preview
}: PageProps) {
  const title = documentTitleOf(snapshot, site)
  const description = descriptionOf(snapshot, site)
  const { canonical, alternates } = linksOf(siteOrigin, snapshot, translations, locales)
  const socialImage = socialImageOf(snapshot, site)
  return (
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <link rel="stylesheet" href={stylesheetPath} />
      {description ? <meta name="description" content={description} /> : null}
      {preview ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <>
          <link rel="canonical" href={canonical} />
          {alternates.map(({ hreflang, href }) => (
            <link key={hreflang} rel="alternate" hrefLang={hreflang} href={href} />
          ))}
        </>
      )}
      <meta property="og:title" content={title} />
      {site ? <meta property="og:site_name" content={site.siteName} /> : null}
      {socialImage ? (
        <meta property="og:image" content={`${siteOrigin}/${socialImage.key}`} />
      ) : null}
      {head?.(snapshot)}
    </head>
  )
}

function SnapshotProvider({
  snapshot,
  locales,
  children
}: Pick<PreviewProps, 'snapshot' | 'locales'> & { children: ReactNode }) {
  return (
    <RenderProvider
      value={{
        locale: snapshot.locale,
        defaultLocale: locales.defaultLocale,
        media: snapshot.media
      }}
    >
      {children}
    </RenderProvider>
  )
}

function PreviewDocument(props: PreviewProps) {
  const { snapshot, stylesheetPath } = props
  return (
    <html lang={snapshot.locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>{snapshot.title}</title>
        <link rel="stylesheet" href={stylesheetPath} />
      </head>
      <body>
        <SnapshotProvider snapshot={snapshot} locales={props.locales}>
          <PageContent components={props.components} snapshot={snapshot} />
        </SnapshotProvider>
      </body>
    </html>
  )
}

function Document(props: PageProps) {
  const { components, snapshot, translations, locales, site, preview } = props
  const layoutComponent =
    components.layouts[snapshot.layout] ?? components.layouts[LAYOUT.default] ?? FallbackLayout
  return (
    <html lang={snapshot.locale}>
      <Head {...props} />
      <body>
        <SnapshotProvider snapshot={snapshot} locales={locales}>
          {createElement(layoutComponent, {
            slots: renderSlots(components, site),
            children: <PageContent components={components} snapshot={snapshot} />
          })}
        </SnapshotProvider>
        <LanguageSwitcher
          snapshot={snapshot}
          translations={translations}
          locales={locales}
          preview={preview}
        />
      </body>
    </html>
  )
}

export const renderPage = (props: PageProps, headers: HeadersInit) =>
  renderHtml(createElement(Document, props), headers)

export const renderPreview = (props: PreviewProps, headers: HeadersInit) =>
  renderHtml(createElement(PreviewDocument, props), headers)
