import { createElement, type ComponentType, type ReactNode } from 'react'

import { LAYOUT, validateBlockContent } from '../../blocks.ts'
import type { ComponentMap, LayoutProps } from '../../components.ts'
import { entryPathOf, type CollectionRoute } from '../../entry-pages.ts'
import type { EntrySnapshot } from '../../entry-publishing.ts'
import { logLine } from '../../log.ts'
import type { AlternateLink } from '../../seo.ts'
import { hasMultipleLocales, type Locale, type LocaleConfig } from '../../locales.ts'
import type { Snapshot } from '../../publishing.ts'
import { Blocks } from '../../render/blocks.tsx'
import { RenderProvider } from '../../render/context.ts'
import { renderSlots } from '../../render/slots.tsx'
import type { SiteSnapshot } from '../../site-publishing.ts'
import { renderHtml } from '../html.ts'
import { localeName, switcherLabel } from '../locales.ts'
import { previewPathOf } from '../../page-preview.ts'
import { pathOf } from '../routing.ts'
import {
  descriptionOf,
  documentTitleOf,
  entryDocumentTitleOf,
  socialImageOf,
  themeColorOf
} from './head.ts'
import { entryLinksOf, linksOf } from './origin.ts'

export type SiteHead = (snapshot: Snapshot) => ReactNode

export type SiteFavicon = string | { href: string; type?: string }

export interface DocumentContext {
  components: ComponentMap
  locales: LocaleConfig
  stylesheetPath: string
  favicon?: SiteFavicon
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

interface SwitcherLink {
  locale: Locale
  href: string
}

function LanguageSwitcher({
  current,
  links,
  locales
}: {
  current: Locale
  links: readonly SwitcherLink[]
  locales: LocaleConfig
}) {
  if (!hasMultipleLocales(locales)) return null
  const ordered = [...links].sort(
    (a, b) =>
      Number(b.locale === locales.defaultLocale) - Number(a.locale === locales.defaultLocale)
  )
  return (
    <nav aria-label={switcherLabel(current)}>
      <ul>
        {ordered.map(({ locale, href }) => (
          <li key={locale}>
            <a
              href={href}
              hrefLang={locale}
              lang={locale}
              aria-current={locale === current ? 'page' : undefined}
            >
              {localeName(locale)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

const faviconLinkOf = (favicon: SiteFavicon) =>
  typeof favicon === 'string' ? { href: favicon } : favicon

interface HeadProps {
  title: string
  description: string
  canonical: string
  alternates: readonly AlternateLink[]
  socialImageUrl: string | null
  siteName: string | null
  themeColor: string | null
  stylesheetPath: string
  favicon?: SiteFavicon
  preview: boolean
  extra?: ReactNode
}

function Head({
  title,
  description,
  canonical,
  alternates,
  socialImageUrl,
  siteName,
  themeColor,
  stylesheetPath,
  favicon,
  preview,
  extra
}: HeadProps) {
  return (
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <link rel="stylesheet" href={stylesheetPath} />
      {favicon ? <link rel="icon" {...faviconLinkOf(favicon)} /> : null}
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
      {siteName ? <meta property="og:site_name" content={siteName} /> : null}
      {socialImageUrl ? <meta property="og:image" content={socialImageUrl} /> : null}
      {themeColor ? (
        <>
          <meta name="theme-color" content={themeColor} />
          <meta name="msapplication-TileColor" content={themeColor} />
        </>
      ) : null}
      {extra}
    </head>
  )
}

const pageHeadOf = (props: PageProps): HeadProps => {
  const {
    snapshot,
    translations,
    siteOrigin,
    site,
    stylesheetPath,
    favicon,
    head,
    locales,
    preview
  } = props
  const socialImage = socialImageOf(snapshot, site)
  return {
    ...linksOf(siteOrigin, snapshot, translations, locales),
    title: documentTitleOf(snapshot, site),
    description: descriptionOf(snapshot, site),
    socialImageUrl: socialImage ? `${siteOrigin}/${socialImage.key}` : null,
    siteName: site?.siteName ?? null,
    themeColor: themeColorOf(site),
    stylesheetPath,
    favicon,
    preview: Boolean(preview),
    extra: head?.(snapshot)
  }
}

function SnapshotProvider({
  snapshot,
  locales,
  children
}: {
  snapshot: Pick<Snapshot, 'locale' | 'media'>
  locales: LocaleConfig
  children: ReactNode
}) {
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

function DocumentBody({
  components,
  snapshot,
  locales,
  site,
  layoutName = LAYOUT.default,
  links,
  children
}: Pick<PageProps, 'components' | 'locales' | 'site'> & {
  snapshot: Pick<Snapshot, 'locale' | 'media'>
  layoutName?: string
  links: readonly SwitcherLink[]
  children: ReactNode
}) {
  const layout =
    components.layouts[layoutName] ?? components.layouts[LAYOUT.default] ?? FallbackLayout
  return (
    <body>
      <SnapshotProvider snapshot={snapshot} locales={locales}>
        {createElement(layout, { slots: renderSlots(components, site), children })}
      </SnapshotProvider>
      <LanguageSwitcher current={snapshot.locale} links={links} locales={locales} />
    </body>
  )
}

function Document(props: PageProps) {
  const { components, snapshot, translations, locales, preview } = props
  return (
    <html lang={snapshot.locale}>
      <Head {...pageHeadOf(props)} />
      <DocumentBody
        {...props}
        layoutName={snapshot.layout}
        links={[snapshot, ...translations].map(({ locale, slug }) => ({
          locale,
          href: preview ? previewPathOf(preview.token, locale) : pathOf({ locale, slug }, locales)
        }))}
      >
        <PageContent components={components} snapshot={snapshot} />
      </DocumentBody>
    </html>
  )
}

export const renderPage = (props: PageProps, headers: HeadersInit) =>
  renderHtml(createElement(Document, props), headers)

export const renderPreview = (props: PreviewProps, headers: HeadersInit) =>
  renderHtml(createElement(PreviewDocument, props), headers)

export interface EntryPageProps extends Omit<DocumentContext, 'head'> {
  snapshot: EntrySnapshot
  translations: readonly EntrySnapshot[]
  route: CollectionRoute
  site: SiteSnapshot | null
  siteOrigin: string
}

const ENTRY_DROP = {
  message: 'entry template skipped',
  reason: { missingTemplate: 'missing_template', invalidContent: 'invalid_content' }
} as const

type EntryDropReason = (typeof ENTRY_DROP.reason)[keyof typeof ENTRY_DROP.reason]

const dropEntry = ({ collection, entryId }: EntrySnapshot, reason: EntryDropReason) => {
  logLine('error', ENTRY_DROP.message, { collection, entryId, reason })
  return null
}

function EntryContent({ components, snapshot }: Pick<EntryPageProps, 'components' | 'snapshot'>) {
  const definition = components.registry.getCollection?.(snapshot.collection)
  const Template = components.collections?.[snapshot.collection] as
    ComponentType<Record<string, unknown>> | undefined
  if (!definition || !Template) return dropEntry(snapshot, ENTRY_DROP.reason.missingTemplate)
  const result = validateBlockContent(definition, snapshot.schemaVersion, snapshot.content)
  if (!result.ok) return dropEntry(snapshot, ENTRY_DROP.reason.invalidContent)
  return <Template {...(result.content as Record<string, unknown>)} />
}

const entryHeadOf = (props: EntryPageProps): HeadProps => {
  const { snapshot, translations, siteOrigin, site, stylesheetPath, favicon, locales, route } =
    props
  const socialImage = site?.seo.socialImageId ? site.media[site.seo.socialImageId] : null
  return {
    ...entryLinksOf(siteOrigin, snapshot, translations, locales, route),
    title: entryDocumentTitleOf(snapshot, site),
    description: site?.seo.description ?? '',
    socialImageUrl: socialImage ? `${siteOrigin}/${socialImage.key}` : null,
    siteName: site?.siteName ?? null,
    themeColor: themeColorOf(site),
    stylesheetPath,
    favicon,
    preview: false
  }
}

function EntryDocument(props: EntryPageProps) {
  const { components, snapshot, translations, locales, route } = props
  return (
    <html lang={snapshot.locale}>
      <Head {...entryHeadOf(props)} />
      <DocumentBody
        {...props}
        links={[snapshot, ...translations].map(({ locale, slug }) => ({
          locale,
          href: entryPathOf(route, slug, locale, locales.defaultLocale)
        }))}
      >
        <EntryContent components={components} snapshot={snapshot} />
      </DocumentBody>
    </html>
  )
}

export const renderEntryPage = (props: EntryPageProps, headers: HeadersInit) =>
  renderHtml(createElement(EntryDocument, props), headers)

export interface ShellProps extends DocumentContext {
  locale: Locale
  title: string
  description: string
  body: ReactNode
  scripts: readonly string[]
  site: SiteSnapshot | null
  siteOrigin: string
  path: string
  translations: Readonly<Record<Locale, string>>
}

const absoluteUrlOf = (siteOrigin: string, path: string) => new URL(path, siteOrigin).href

const shellHeadOf = (props: ShellProps): HeadProps => {
  const { siteOrigin, site, path, translations, title, description, locale } = props
  const paths = { ...translations, [locale]: path }
  return {
    canonical: absoluteUrlOf(siteOrigin, path),
    alternates: Object.keys(translations).length
      ? Object.entries(paths).map(([hreflang, href]) => ({
          hreflang,
          href: absoluteUrlOf(siteOrigin, href)
        }))
      : [],
    title: entryDocumentTitleOf({ title }, site),
    description: description || site?.seo.description || '',
    socialImageUrl: null,
    siteName: site?.siteName ?? null,
    themeColor: themeColorOf(site),
    stylesheetPath: props.stylesheetPath,
    favicon: props.favicon,
    preview: false,
    extra: props.scripts.map((src) => <script key={src} type="module" src={src} />)
  }
}

function ShellDocument(props: ShellProps) {
  const { locale, translations, path } = props
  const links = Object.entries({ ...translations, [locale]: path }).map(([code, href]) => ({
    locale: code,
    href
  }))
  return (
    <html lang={locale}>
      <Head {...shellHeadOf(props)} />
      <DocumentBody {...props} snapshot={{ locale, media: {} }} links={links}>
        {props.body}
      </DocumentBody>
    </html>
  )
}

export const renderShell = (props: ShellProps, headers: HeadersInit) =>
  renderHtml(createElement(ShellDocument, props), headers)
