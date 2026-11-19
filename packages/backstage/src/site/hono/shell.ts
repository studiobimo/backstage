import type { Context } from 'hono'
import type { ReactNode } from 'react'

import type { Locale } from '../../locales.ts'
import { findSiteSnapshot } from '../store.ts'
import type { SiteEnvironment } from './create-site.ts'
import { renderShell } from './document.tsx'
import { siteOriginOf } from './origin.ts'

const SCRIPT_PATH = { prefix: '/', protocolRelativePrefix: '//' } as const

const INVALID_SCRIPT_MESSAGE = 'renderInShell scripts must be same-origin paths such as /app.js'

export interface ShellOptions {
  locale: Locale
  title: string
  description?: string
  body: ReactNode
  scripts?: readonly string[]
  translations?: Readonly<Record<Locale, string>>
}

const isSameOriginPath = (script: string) =>
  script.startsWith(SCRIPT_PATH.prefix) && !script.startsWith(SCRIPT_PATH.protocolRelativePrefix)

export const renderInShell = async (c: Context<SiteEnvironment>, options: ShellOptions) => {
  const { locale, title, description = '', body, scripts = [], translations = {} } = options
  if (!scripts.every(isSameOriginPath)) throw new Error(INVALID_SCRIPT_MESSAGE)
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
