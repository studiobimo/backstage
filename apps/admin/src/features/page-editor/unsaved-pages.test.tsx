import { act, render, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PageDraft } from './draft'
import {
  clearDraft,
  DRAFT_STORAGE,
  readDraft,
  useDraftIds,
  useDraftPersistence,
  writeDraft
} from './unsaved-pages'

const draft: PageDraft = {
  blocks: [{ id: 'a', block: 'hero', schemaVersion: 1, content: { title: 'One' } }],
  layout: 'default',
  seo: { en: { title: '', description: '', socialImageId: null } }
}

const KEY = `${DRAFT_STORAGE.keyPrefix}p1`

function Persist({ dirty, value = draft }: { dirty: boolean; value?: PageDraft }) {
  useDraftPersistence('p1', value, dirty)
  return null
}

beforeEach(() => vi.useFakeTimers())

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('draft storage', () => {
  it('writes a draft and reads it back', () => {
    writeDraft('p1', draft, 100)
    expect(readDraft('p1', 50)).toEqual(draft)
  })

  it('drops a draft older than the server version', () => {
    writeDraft('p1', draft, 100)
    expect(readDraft('p1', 200)).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('drops anything that is not valid', () => {
    localStorage.setItem(KEY, '{"savedAt":1,"blocks":"nope"}')
    expect(readDraft('p1', 0)).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
    localStorage.setItem(KEY, 'not json')
    expect(readDraft('p1', 0)).toBeNull()
  })

  it('refuses a draft over the size cap and clears the old one', () => {
    writeDraft('p1', draft, 100)
    const huge = { ...draft, layout: 'x'.repeat(DRAFT_STORAGE.maxBytes) }
    writeDraft('p1', huge, 200)
    expect(readDraft('p1', 0)).toBeNull()
  })

  it('clears a draft', () => {
    writeDraft('p1', draft)
    clearDraft('p1')
    expect(readDraft('p1', 0)).toBeNull()
  })

  it('works without storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => writeDraft('p1', draft)).not.toThrow()
    expect(readDraft('p1', 0)).toBeNull()
    expect(() => clearDraft('p1')).not.toThrow()
    vi.restoreAllMocks()
  })
})

describe('draft persistence', () => {
  it('stores a dirty draft after the debounce and clears it once saved', () => {
    const editor = render(<Persist dirty />)
    expect(localStorage.getItem(KEY)).toBeNull()
    act(() => void vi.advanceTimersByTime(DRAFT_STORAGE.debounceMs))
    expect(readDraft('p1', 0)).toEqual(draft)
    editor.rerender(<Persist dirty={false} />)
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('keeps a draft when the editor closes after keep, and drops it after discard', () => {
    const { result } = renderHook(() => useDraftPersistence('p1', draft, true))
    act(() => result.current.keep())
    expect(readDraft('p1', 0)).toEqual(draft)
    act(() => result.current.discard())
    expect(readDraft('p1', 0)).toBeNull()
  })

  it('reports the pages with a valid draft', () => {
    const pages = [
      { id: 'p1', updatedAt: 0 },
      { id: 'p2', updatedAt: 0 }
    ]
    const { result } = renderHook(() => useDraftIds(pages))
    expect(result.current.size).toBe(0)
    act(() => writeDraft('p1', draft))
    expect([...result.current]).toEqual(['p1'])
    act(() => clearDraft('p1'))
    expect(result.current.size).toBe(0)
  })
})
