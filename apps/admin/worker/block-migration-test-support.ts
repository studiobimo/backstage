import { defineBlock, defineRegistry } from '@studiobimo/backstage'
import { createAdmin } from '@studiobimo/backstage/admin'
import { z } from 'zod'

import { sendTo } from './pages-test-support'

export const RESPONSE = { ok: 200, unpublishable: 422 } as const

export const NOTE_VERSION = { current: 2, legacy: 1, newer: 3 } as const

const noteBlock = defineBlock({
  name: 'note',
  version: NOTE_VERSION.current,
  schema: z.object({ text: z.string().min(1), tags: z.array(z.string().min(1)) }),
  migrate: (content, fromVersion) => {
    if (fromVersion !== NOTE_VERSION.legacy) return content
    const { body } = content as { body: string }
    return { text: body.trim(), tags: [] }
  }
})

const bannerBlock = defineBlock({
  name: 'banner',
  version: NOTE_VERSION.current,
  schema: z.object({ text: z.string().min(1) }),
  migrate: (content) => ({ text: (content as { body: string }).body })
})

const registry = defineRegistry([noteBlock, bannerBlock], { slots: { header: ['banner'] } })

const migratingAdmin = createAdmin(registry)

export const adminRequest = (method: string, path: string, body?: unknown) =>
  sendTo(migratingAdmin, method, path, body)

export const legacyNote = (id: string, body: string) => ({
  id,
  block: 'note',
  schemaVersion: NOTE_VERSION.legacy,
  content: { body }
})

export interface OpenedBlock {
  id: string
  block: string
  schemaVersion: number
  content: unknown
}

export const blocksOf = async (id: string) =>
  (await (await adminRequest('GET', `/pages/${id}/blocks`)).json()) as {
    version: number
    blocks: OpenedBlock[]
  }

export const saveBlocksAs = async (id: string, blocks: unknown[]) =>
  adminRequest('PUT', `/pages/${id}/blocks`, {
    blocks,
    expectedVersion: (await blocksOf(id)).version
  })

export const publishPage = async (id: string) =>
  adminRequest('POST', `/pages/${id}/publish`, { expectedVersion: (await blocksOf(id)).version })
