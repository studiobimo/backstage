import { defineRegistry } from '@studiobimo/backstage'
import { createAdmin } from '@studiobimo/backstage/admin'
import { resolveLocaleConfig } from '@studiobimo/backstage/internal'
import { findPublished, parseRoute } from '@studiobimo/backstage/site'
import { registry as sampleRegistry } from 'backstage-site/registry'
import { describe, expect, it } from 'vitest'

import { createRegularPage, home, kv, send, sendTo, useFreshPagesDb } from './pages-test-support'
import { addMedia, hero } from './publish-test-support'

const spanishFirst = defineRegistry([...sampleRegistry.blocks.values()], {
  locales: ['es', 'en'],
  defaultLocale: 'es',
  slots: Object.fromEntries(sampleRegistry.slots),
  layouts: [...sampleRegistry.layouts.values()]
})
const spanishAdmin = createAdmin(spanishFirst)
const config = resolveLocaleConfig(spanishFirst)

const publishWithSpanishDefault = async (id: string) => {
  const blocks = (await (await send('GET', `/${id}/blocks`)).json()) as { version: number }
  return sendTo(spanishAdmin, 'POST', `/pages/${id}/publish`, { expectedVersion: blocks.version })
}

const published = async (path: string) => {
  const route = parseRoute(path, config)
  return route && findPublished(kv, route)
}

const createHome = async () =>
  ((await (await send('POST', '', home)).json()) as { page: { id: string } }).page.id

describe('publishing a site whose default locale is Spanish', () => {
  useFreshPagesDb()

  it('serves the home page at / in Spanish and at /en in English', async () => {
    await publishWithSpanishDefault(await createHome())
    expect(await published('/')).toMatchObject({ locale: 'es', title: 'Inicio' })
    expect(await published('/en')).toMatchObject({ locale: 'en', title: 'Home' })
    expect(await published('/es')).toBeNull()
  })

  it('serves a page at its Spanish slug and under /en for English', async () => {
    const id = await createRegularPage()
    expect((await publishWithSpanishDefault(id)).status).toBe(200)
    expect(await published('/about-es')).toMatchObject({ locale: 'es', title: 'Acerca' })
    expect(await published('/en/about')).toMatchObject({ locale: 'en', title: 'About' })
    expect(await published('/about')).toBeNull()
  })

  it('refuses a required field that only English fills', async () => {
    await addMedia('m1')
    const id = await createRegularPage()
    const english = hero()
    const saved = await send('PUT', `/${id}/blocks`, {
      blocks: [{ ...english, content: { ...english.content, title: { en: 'Hello' } } }],
      expectedVersion: 1
    })
    expect(saved.status).toBe(200)
    const response = await publishWithSpanishDefault(id)
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      problems: expect.arrayContaining([
        expect.objectContaining({ reason: 'missing_default_locale', path: 'title' })
      ])
    })
  })
})
