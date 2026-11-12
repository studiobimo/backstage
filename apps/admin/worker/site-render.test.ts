import type { ComponentMap } from '@studiobimo/backstage'
import { renderSlots } from '@studiobimo/backstage/render'
import { findSiteSnapshot } from '@studiobimo/backstage/site'
import { registry } from 'backstage-site/registry'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { kv, useFreshPagesDb } from './pages-test-support'
import { publishSite, saveHeader, saveName } from './site-publish-test-support'

type Navigation = { link: { en: { label: string } } }[]

const components: ComponentMap = {
  registry,
  blocks: {
    'site-header': (({ navigation }: { navigation: Navigation }) =>
      createElement(
        'nav',
        null,
        navigation.map(({ link }) => link.en.label)
      )) as never
  },
  layouts: {}
}

const renderedPage = async (locale: 'en' | 'es') =>
  renderToStaticMarkup(
    createElement(
      'body',
      null,
      renderSlots(components, await findSiteSnapshot(kv, locale)).header,
      createElement('main', null, 'Page')
    )
  )

describe('a rendered page after the site is published', () => {
  useFreshPagesDb()

  it('shows the published header', async () => {
    await saveName({ en: 'Studio', es: 'Estudio' })
    await saveHeader('About us')
    await publishSite()
    expect(await renderedPage('en')).toBe('<body><nav>About us</nav><main>Page</main></body>')
  })

  it('shows no header before the site is published, and the old one while a draft waits', async () => {
    await saveName({ en: 'Studio' })
    await saveHeader('About us')
    expect(await renderedPage('en')).toBe('<body><main>Page</main></body>')
    await publishSite()
    await saveHeader('Work')
    expect(await renderedPage('en')).toContain('About us')
  })
})
