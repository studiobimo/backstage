import { defineBlock, defineRegistry, link, localized } from '@studiobimo/backstage'
import { createAdmin } from '@studiobimo/backstage/admin'
import { snapshotKey } from '@studiobimo/backstage/site'
import { expect } from 'vitest'
import { z } from 'zod'

import { kv, regular, send, sendTo } from './pages-test-support'

const linkSchema = z.object({ cta: localized(link()) })

const linkerBlock = defineBlock({ name: 'linker', version: 1, schema: linkSchema })

const slotLinkerBlock = defineBlock({ name: 'slot-linker', version: 1, schema: linkSchema })

export const linkingAdmin = createAdmin(
  defineRegistry([linkerBlock, slotLinkerBlock], {
    locales: ['en', 'es'],
    slots: { header: ['slot-linker'] }
  })
)

export const createPage = async (slug: string) =>
  ((await (await send('POST', '', regular(slug))).json()) as { page: { id: string } }).page.id

export const linkingTo = (pageId: string) => ({
  id: 'b1',
  block: 'linker',
  schemaVersion: 1,
  content: { cta: { en: { kind: 'page', pageId, label: 'Contact' } } }
})

const versionOfBlocks = async (id: string) =>
  ((await (await sendTo(linkingAdmin, 'GET', `/pages/${id}/blocks`)).json()) as { version: number })
    .version

export const publishWith = (id: string) => async () =>
  sendTo(linkingAdmin, 'POST', `/pages/${id}/publish`, {
    expectedVersion: await versionOfBlocks(id)
  })

export const saveLinkingTo = async (id: string, target: string) => {
  const saved = await sendTo(linkingAdmin, 'PUT', `/pages/${id}/blocks`, {
    blocks: [linkingTo(target)],
    expectedVersion: await versionOfBlocks(id)
  })
  expect(saved.status).toBe(200)
}

export const hrefIn = async (id: string, locale: string) => {
  const snapshot = JSON.parse((await kv.get(snapshotKey(id, locale)))!) as {
    blocks: { content: { cta: { en: { href: string } } } }[]
  }
  return snapshot.blocks[0]?.content.cta.en.href
}
