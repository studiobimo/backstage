import type { Context } from 'hono'
import type { ReactNode } from 'react'

import type { Locale } from '../../locales.ts'
import { assertSameOriginAssets, type ClientAssets } from '../../client-scripts.ts'
import { findSiteSnapshot } from '../store.ts'
import type { SiteEnvironment } from './create-site.ts'
import { renderShell } from './document.tsx'
import { siteOriginOf } from './origin.ts'

const SHELL_OWNER = 'renderInShell'

export interface ShellOptions extends ClientAssets {
  locale: Locale
  title: string
  description?: string
  body: ReactNode
  head?: ReactNode
  translations?: Readonly<Record<Locale, string>>
}

export const renderInShell = async (c: Context<SiteEnvironment>, options: ShellOptions) => {
  const {
    locale,
    title,
    description = '',
    body,
    head,
    scripts = [],
    styles = [],
    preloads = [],
    translations = {}
  } = options
  assertSameOriginAssets(SHELL_OWNER, { scripts, styles, preloads })
  return renderShell(
    {
      ...c.get('siteDocument'),
      locale,
      title,
      description,
      body,
      routeHead: head,
      scripts,
      styles,
      preloads,
      translations,
      site: await findSiteSnapshot(c.env.SITE, locale),
      siteOrigin: siteOriginOf(c.env),
      path: new URL(c.req.url).pathname
    },
    {}
  )
}
