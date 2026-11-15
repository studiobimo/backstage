import { readFileSync } from 'node:fs'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import {
  clearKv,
  get,
  platform,
  publishSiteSnapshots,
  publishSnapshots,
  siteSnapshotOf,
  snapshotOf
} from './test-support'

afterAll(() => platform.dispose())
beforeEach(clearKv)

const header = (label: string) => ({
  block: 'site-header',
  schemaVersion: 1,
  content: { navigation: [{ link: { en: { href: '/about', label } }, dropdown: [] }] }
})

const publishAbout = () =>
  publishSnapshots(
    snapshotOf({ locale: 'en', slug: 'about', title: 'About' }),
    snapshotOf({ locale: 'es', slug: 'acerca', title: 'Acerca' })
  )

const html = async (path: string) => (await get(path)).text()

describe('the published site on a rendered page', () => {
  it('shows the published header', async () => {
    await publishAbout()
    await publishSiteSnapshots(
      siteSnapshotOf({ locale: 'en', slots: { header: header('Our work') } })
    )
    expect(await html('/about')).toContain('Our work')
  })

  it('shows no header and the page title alone before the site is published', async () => {
    await publishAbout()
    const page = await html('/about')
    expect(page).not.toContain('<header>')
    expect(page).not.toContain('og:site_name')
    expect(page).toContain('<title>About</title>')
  })

  it('names the site in the language of the page', async () => {
    await publishAbout()
    await publishSiteSnapshots(
      siteSnapshotOf({ locale: 'en', siteName: 'Studio' }),
      siteSnapshotOf({ locale: 'es', siteName: 'Estudio' })
    )
    expect(await html('/about')).toContain('property="og:site_name" content="Studio"')
    expect(await html('/es/acerca')).toContain('property="og:site_name" content="Estudio"')
  })

  it('has no database binding', () => {
    expect(Object.keys(platform.env)).not.toContain('DB')
    expect(readFileSync(`${import.meta.dirname}/../wrangler.jsonc`, 'utf8')).not.toMatch(
      /d1_databases/
    )
  })
})
