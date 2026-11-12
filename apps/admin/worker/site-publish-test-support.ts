import { siteSnapshotKey, siteSnapshotSchema, type SitePublication } from '@studiobimo/backstage'

import { db, kv, sendApi } from './pages-test-support'

export const headerWith = (label: string) => ({
  block: 'site-header',
  schemaVersion: 1,
  content: { navigation: [{ link: { en: { href: '/about', label } }, dropdown: [] }] }
})

const versionOf = async (sql: string, ...binds: string[]) =>
  (await db
    .prepare(sql)
    .bind(...binds)
    .first<{ version: number }>('version')) ?? 0

export const saveSettings = async (settings: object) =>
  sendApi('/settings', 'PUT', {
    ...settings,
    expectedVersion: await versionOf("SELECT version FROM site_settings WHERE id = 'site'")
  })

export const saveName = (siteName: Record<string, string>) => saveSettings({ siteName })

export const saveHeader = async (label: string) =>
  sendApi('/slots/header', 'PUT', {
    ...headerWith(label),
    expectedVersion: await versionOf('SELECT version FROM site_blocks WHERE slot = ?', 'header')
  })

export const publishSite = () => sendApi('/site/publish', 'POST')

export const publicationOf = async () =>
  ((await (await sendApi('/site/publication')).json()) as { publication: SitePublication })
    .publication

export const publishedSite = async (locale: 'en' | 'es') => {
  const stored = await kv.get(siteSnapshotKey(locale), 'json')
  return stored === null ? null : siteSnapshotSchema.parse(stored)
}
