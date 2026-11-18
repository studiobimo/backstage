import { pageBlocksResponseSchema, pageSeoResponseSchema } from '@studiobimo/backstage/internal'
import { useEffect, useSyncExternalStore } from 'react'
import { z } from 'zod'

import type { PageDraft } from './draft'

export const DRAFT_STORAGE = {
  keyPrefix: 'backstage:page-draft:',
  maxBytes: 262144,
  debounceMs: 500
} as const

const storedDraftSchema = z.object({
  savedAt: z.number().int(),
  blocks: pageBlocksResponseSchema.shape.blocks,
  layout: z.string(),
  seo: pageSeoResponseSchema.shape.seo
})

const keyOf = (pageId: string) => `${DRAFT_STORAGE.keyPrefix}${pageId}`

const storage = () => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

let version = 0
const listeners = new Set<() => void>()

const notify = () => {
  version += 1
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  window.addEventListener('storage', notify)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', notify)
  }
}

const getVersion = () => version

const removeStored = (pageId: string) => {
  try {
    const store = storage()
    const existed = store?.getItem(keyOf(pageId)) != null
    store?.removeItem(keyOf(pageId))
    return existed
  } catch {
    return false
  }
}

export const clearDraft = (pageId: string) => {
  if (removeStored(pageId)) notify()
}

export const writeDraft = (pageId: string, draft: PageDraft, now = Date.now()) => {
  const serialized = JSON.stringify({ ...draft, savedAt: now })
  if (serialized.length > DRAFT_STORAGE.maxBytes) return clearDraft(pageId)
  try {
    storage()?.setItem(keyOf(pageId), serialized)
  } catch {
    return
  }
  notify()
}

const parseStored = (raw: string) => {
  try {
    return storedDraftSchema.safeParse(JSON.parse(raw))
  } catch {
    return null
  }
}

const readStored = (pageId: string) => {
  try {
    return storage()?.getItem(keyOf(pageId)) ?? null
  } catch {
    return null
  }
}

export const readDraft = (pageId: string, serverUpdatedAt: number): PageDraft | null => {
  const raw = readStored(pageId)
  if (raw === null) return null
  const parsed = parseStored(raw)
  if (!parsed?.success || parsed.data.savedAt < serverUpdatedAt) {
    removeStored(pageId)
    return null
  }
  const { blocks, layout, seo } = parsed.data
  return { blocks, layout, seo }
}

export function useDraftIds(pages: { id: string; updatedAt: number }[]) {
  useSyncExternalStore(subscribe, getVersion)
  return new Set(pages.filter((page) => readDraft(page.id, page.updatedAt)).map(({ id }) => id))
}

export function useDraftPersistence(pageId: string, draft: PageDraft, dirty: boolean) {
  const { blocks, layout, seo } = draft
  useEffect(() => {
    if (!dirty) {
      clearDraft(pageId)
      return
    }
    const timer = setTimeout(
      () => writeDraft(pageId, { blocks, layout, seo }),
      DRAFT_STORAGE.debounceMs
    )
    return () => clearTimeout(timer)
  }, [pageId, dirty, blocks, layout, seo])

  useEffect(() => {
    if (!dirty) return
    const flush = () => writeDraft(pageId, { blocks, layout, seo })
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [pageId, dirty, blocks, layout, seo])

  return {
    keep: () => writeDraft(pageId, { blocks, layout, seo }),
    discard: () => clearDraft(pageId)
  }
}
