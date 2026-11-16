import { LINK } from './fields.ts'
import type { Locale, LocaleConfig } from './locales.ts'
import { pageTarget, type PublishedPage } from './seo.ts'
import { isRecord, mapMarkedFields, markedFieldsIn, type TranslatedNode } from './translations.ts'

export type PageAddresses = ReadonlyMap<string, PublishedPage>

export interface PageLinkIssue {
  path: string
  pageId: string
  reason: 'unpublished' | 'missingSlug'
}

const pageIdOf = (value: unknown) =>
  isRecord(value) && value.kind === LINK.kind.page && typeof value.pageId === 'string'
    ? value.pageId
    : null

const pageLinksIn = (node: TranslatedNode, content: unknown) =>
  markedFieldsIn(node, content, 'link').flatMap(({ path, value }) => {
    const pageId = pageIdOf(value)
    return pageId === null ? [] : [{ path, pageId }]
  })

export const pageLinkIdsIn = (node: TranslatedNode, content: unknown) => [
  ...new Set(pageLinksIn(node, content).map(({ pageId }) => pageId))
]

export const pageLinkIssuesIn = (
  node: TranslatedNode,
  content: unknown,
  addresses: PageAddresses,
  locales: readonly Locale[]
): PageLinkIssue[] =>
  pageLinksIn(node, content).flatMap(({ path, pageId }): PageLinkIssue[] => {
    const page = addresses.get(pageId)
    if (!page) return [{ path, pageId, reason: 'unpublished' }]
    const lacksSlug = locales.some((locale) => !page.isHome && !page.slugs[locale])
    return lacksSlug ? [{ path, pageId, reason: 'missingSlug' }] : []
  })

export const resolvePageLinks = (
  node: TranslatedNode,
  content: unknown,
  locale: Locale,
  addresses: PageAddresses,
  { defaultLocale }: Pick<LocaleConfig, 'defaultLocale'>
) =>
  mapMarkedFields(node, content, 'link', ({ value }) => {
    const pageId = pageIdOf(value)
    const page = pageId === null ? undefined : addresses.get(pageId)
    if (!page || !isRecord(value)) return value
    return { href: pageTarget(page, defaultLocale).pathOf(locale), label: value.label ?? '' }
  })
