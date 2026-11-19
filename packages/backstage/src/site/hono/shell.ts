import type { Context } from 'hono'
import type { ReactNode } from 'react'

import type { Locale } from '../../locales.ts'
import { assertSameOriginPaths } from '../../client-scripts.ts'
import { findSiteSnapshot } from '../store.ts'
import type { SiteEnvironment } from './create-site.ts'
import { renderShell } from './document.tsx'
import { siteOriginOf } from './origin.ts'

const SHELL_SCRIPTS_OWNER = 'renderInShell scripts'

export interface ShellOptions {
  locale: Locale
  title: string
  description?: string
  body: ReactNode
  scripts?: readonly string[]
  translations?: Readonly<Record<Locale, string>>
}

export const renderInShell = async (c: Context<SiteEnvironment>, options: ShellOptions) => {
  const { locale, title, description = '', body, scripts = [], translations = {} } = options
  assertSameOriginPaths(SHELL_SCRIPTS_OWNER, scripts)
  return renderShell(
    {
      ...c.get('siteDocument'),
      locale,
      title,
      description,
      body,
      scripts,
      translations,
      site: await findSiteSnapshot(c.env.SITE, locale),
      siteOrigin: siteOriginOf(c.env),
      path: new URL(c.req.url).pathname
    },
    {}
  )
}
