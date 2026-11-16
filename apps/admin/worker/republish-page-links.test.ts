import { siteSnapshotKey } from '@studiobimo/backstage/site'
import { describe, expect, it } from 'vitest'

import {
  createPage,
  hrefIn,
  linkingAdmin,
  linkingTo,
  publishWith,
  saveLinkingTo
} from './page-links-test-support'
import { db, kv, regular, send, sendTo, useFreshPagesDb } from './pages-test-support'

const linksOf = async (owner: string | null) =>
  (
    await (
      owner === null
        ? db.prepare('SELECT target_page_id FROM page_link_refs WHERE page_id IS NULL')
        : db.prepare('SELECT target_page_id FROM page_link_refs WHERE page_id = ?').bind(owner)
    ).all<{ target_page_id: string }>()
  ).results.map(({ target_page_id }) => target_page_id)

const renameTo = async (id: string, slug: string) => {
  const { version } = (await (await send('GET', `/${id}/blocks`)).json()) as { version: number }
  const response = await sendTo(linkingAdmin, 'PUT', `/pages/${id}`, {
    ...regular(slug),
    expectedVersion: version
  })
  expect(response.status).toBe(200)
}

const linkedPair = async () => {
  const target = await createPage('contact')
  await publishWith(target)()
  const linker = await createPage('about')
  await saveLinkingTo(linker, target)
  await publishWith(linker)()
  return { target, linker }
}

const saveHeaderLinkingTo = async (target: string) => {
  const saved = await sendTo(linkingAdmin, 'PUT', '/slots/header', {
    ...linkingTo(target),
    block: 'slot-linker',
    expectedVersion: 0
  })
  expect(saved.status).toBe(200)
}

describe('republishing the pages that link to a changed page', () => {
  useFreshPagesDb()

  it('records which pages a published page links to, and forgets them when unpublished', async () => {
    const { target, linker } = await linkedPair()
    expect(await linksOf(linker)).toEqual([target])
    await sendTo(linkingAdmin, 'DELETE', `/pages/${linker}/publish`)
    expect(await linksOf(linker)).toEqual([])
  })

  it('writes the new address into the linking page once the renamed page is published', async () => {
    const { target, linker } = await linkedPair()
    await renameTo(target, 'reach-us')
    expect(await hrefIn(linker, 'en')).toBe('/contact')
    const response = await publishWith(target)()
    expect(await response.json()).toMatchObject({ republish: { pages: 1, pending: false } })
    expect(await hrefIn(linker, 'en')).toBe('/reach-us')
    expect(await hrefIn(linker, 'es')).toBe('/es/reach-us-es')
  })

  it('names the linking page as skipped and keeps its snapshot when the target is unpublished', async () => {
    const { target, linker } = await linkedPair()
    const response = await sendTo(linkingAdmin, 'DELETE', `/pages/${target}/publish`)
    expect(await response.json()).toMatchObject({
      republish: { pages: 1, batch: { skipped: [{ pageId: linker }] } }
    })
    expect(await hrefIn(linker, 'en')).toBe('/contact')
  })

  it('does nothing for a page that no published page links to', async () => {
    const lonely = await createPage('lonely')
    const response = await publishWith(lonely)()
    expect(await response.json()).toMatchObject({ republish: { pages: 0, batch: null } })
  })

  it('republishes the linking page when a linked page is deleted', async () => {
    const { target, linker } = await linkedPair()
    expect((await sendTo(linkingAdmin, 'DELETE', `/pages/${target}`)).status).toBe(204)
    expect(await hrefIn(linker, 'en')).toBe('/contact')
    expect(await linksOf(linker)).toEqual([target])
  })

  it('records the links of the site slots and refreshes them when the page is renamed', async () => {
    const target = await createPage('contact')
    await publishWith(target)()
    await sendTo(linkingAdmin, 'PUT', '/settings', {
      siteName: { en: 'Studio' },
      expectedVersion: 0
    })
    await saveHeaderLinkingTo(target)
    expect((await sendTo(linkingAdmin, 'POST', '/site/publish')).status).toBe(200)
    expect(await linksOf(null)).toEqual([target])
    await renameTo(target, 'reach-us')
    await publishWith(target)()
    const header = JSON.parse((await kv.get(siteSnapshotKey('en')))!) as {
      slots: { header: { content: { cta: { en: { href: string } } } } }
    }
    expect(header.slots.header.content.cta.en.href).toBe('/reach-us')
  })
})
