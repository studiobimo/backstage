import { defineBlock, defineRegistry, link, localized } from '@studiobimo/backstage'
import { createAdmin } from '@studiobimo/backstage/admin'
import { snapshotKey } from '@studiobimo/backstage/site'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { kv, regular, send, sendTo, useFreshPagesDb } from './pages-test-support'

const linkerBlock = defineBlock({
  name: 'linker',
  version: 1,
  schema: z.object({ cta: localized(link()) })
})

const linkingAdmin = createAdmin(defineRegistry([linkerBlock], { locales: ['en', 'es'] }))

const createPage = async (slug: string) =>
  ((await (await send('POST', '', regular(slug))).json()) as { page: { id: string } }).page.id

const linkingTo = (pageId: string) => ({
  id: 'b1',
  block: 'linker',
  schemaVersion: 1,
  content: { cta: { en: { kind: 'page', pageId, label: 'Contact' } } }
})

const publishWith = (id: string) => async () => {
  const { version } = (await (await sendTo(linkingAdmin, 'GET', `/pages/${id}/blocks`)).json()) as {
    version: number
  }
  return sendTo(linkingAdmin, 'POST', `/pages/${id}/publish`, { expectedVersion: version })
}

const saveLinkingTo = async (id: string, target: string) => {
  const { version } = (await (await sendTo(linkingAdmin, 'GET', `/pages/${id}/blocks`)).json()) as {
    version: number
  }
  const saved = await sendTo(linkingAdmin, 'PUT', `/pages/${id}/blocks`, {
    blocks: [linkingTo(target)],
    expectedVersion: version
  })
  expect(saved.status).toBe(200)
}

const hrefIn = async (id: string, locale: string) => {
  const snapshot = JSON.parse((await kv.get(snapshotKey(id, locale)))!) as {
    blocks: { content: { cta: { en: { href: string } } } }[]
  }
  return snapshot.blocks[0]?.content.cta.en.href
}

describe('publishing a page that links to another page', () => {
  useFreshPagesDb()

  it('writes the address of the linked page for each language', async () => {
    const target = await createPage('contact')
    expect((await publishWith(target)()).status).toBe(200)
    const id = await createPage('about')
    await saveLinkingTo(id, target)
    expect((await publishWith(id)()).status).toBe(200)
    expect(await hrefIn(id, 'en')).toBe('/contact')
    expect(await hrefIn(id, 'es')).toBe('/es/contact-es')
  })

  it('refuses a link to a page that is not published and names the block', async () => {
    const target = await createPage('contact')
    const id = await createPage('about')
    await saveLinkingTo(id, target)
    const response = await publishWith(id)()
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      code: 'unpublishable',
      problems: [{ reason: 'unpublished_page_link', blockId: 'b1', path: 'cta.en' }]
    })
    expect(await kv.get(snapshotKey(id, 'en'))).toBeNull()
  })

  it('refuses a link to a page that was unpublished after it was linked', async () => {
    const target = await createPage('contact')
    await publishWith(target)()
    const id = await createPage('about')
    await saveLinkingTo(id, target)
    await sendTo(linkingAdmin, 'DELETE', `/pages/${target}/publish`)
    expect((await publishWith(id)()).status).toBe(422)
  })
})
