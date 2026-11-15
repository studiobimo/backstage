import { defineComponents, defineRegistry, type LocaleConfig } from '@studiobimo/backstage'
import { EMPTY_PUBLISHED_INDEX, SEO, upsertIntoIndex } from '@studiobimo/backstage/site'
import { createSite } from '@studiobimo/backstage/site/hono'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { components } from '../src/blocks/component-map'
import { registry } from '../src/blocks/registry'
import { SITE_LOCALES } from '../src/blocks/locales'
import { clearKv, kv, platform, publishSnapshots, snapshotOf } from './test-support'

afterAll(() => platform.dispose())
beforeEach(clearKv)

const siteFor = (localeConfig: Partial<LocaleConfig>) =>
  createSite({
    components: defineComponents(defineRegistry([], localeConfig), { blocks: {}, layouts: {} }),
    stylesheet: ''
  })

const request = (site: ReturnType<typeof siteFor>, path: string) =>
  site.request(path, {}, platform.env)

const aboutIn = (locales: string[]) =>
  locales.map((locale) => snapshotOf({ locale, slug: 'about', title: `About ${locale}` }))

const publishAbout = async (...locales: string[]) => {
  const snapshots = aboutIn(locales)
  await publishSnapshots(...snapshots)
  await kv.put(SEO.indexKey, JSON.stringify(upsertIntoIndex(EMPTY_PUBLISHED_INDEX, snapshots)))
}

const alternatesIn = (sitemap: string) =>
  [...sitemap.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(
    ([, hreflang, href]) => [hreflang, new URL(href!).pathname] as const
  )

describe('the site registry', () => {
  it('declares the locales the site is built for', () => {
    expect(registry.locales).toEqual(SITE_LOCALES.locales)
    expect(registry.defaultLocale).toBe(SITE_LOCALES.defaultLocale)
    expect(components.registry).toBe(registry)
  })
})

describe('a site whose default locale is Spanish', () => {
  const site = siteFor({ locales: ['es', 'en'] })

  it('serves Spanish at the root and English under its prefix', async () => {
    await publishAbout('es', 'en')
    const spanish = await (await request(site, '/about')).text()
    const english = await (await request(site, '/en/about')).text()
    expect(spanish).toContain('lang="es"')
    expect(spanish).toContain('About es')
    expect(english).toContain('lang="en"')
    expect(english).toContain('About en')
    expect((await request(site, '/es/about')).status).toBe(404)
  })

  it('lists both locales with the Spanish page as x-default in the sitemap', async () => {
    await publishAbout('es', 'en')
    const sitemap = await (await request(site, '/sitemap.xml')).text()
    expect(alternatesIn(sitemap)).toEqual(
      expect.arrayContaining([
        ['x-default', '/about'],
        ['es', '/about'],
        ['en', '/en/about']
      ])
    )
  })
})

describe('a site with locales other than English and Spanish', () => {
  const site = siteFor({ locales: ['fr', 'de'] })

  it('serves each locale and refuses one it does not declare', async () => {
    await publishAbout('fr', 'de', 'en')
    expect(await (await request(site, '/about')).text()).toContain('lang="fr"')
    expect(await (await request(site, '/de/about')).text()).toContain('lang="de"')
    expect((await request(site, '/en/about')).status).toBe(404)
  })
})

describe('a site with one locale', () => {
  it('serves it at the root with no alternates', async () => {
    const site = siteFor({ locales: ['fr'] })
    await publishAbout('fr')
    const html = await (await request(site, '/about')).text()
    expect(html).toContain('lang="fr"')
    expect(html).not.toContain('rel="alternate"')
  })
})
