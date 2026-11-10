import type { PageBlock } from '@studiobimo/backstage'
import { describe, expect, it } from 'vitest'

import { describeChanges, duplicateAt, moveBlock, newBlock, removeAt, sameBlocks } from './draft'

const block = (id: string): PageBlock => ({
  id,
  block: 'hero',
  schemaVersion: 1,
  content: { title: { en: id } }
})
const ids = (blocks: PageBlock[]) => blocks.map((entry) => entry.id)

describe('page draft', () => {
  it('moves a block to a new position', () => {
    expect(ids(moveBlock([block('a'), block('b'), block('c')], 0, 2))).toEqual(['b', 'c', 'a'])
    expect(ids(moveBlock([block('a'), block('b'), block('c')], 2, 0))).toEqual(['c', 'a', 'b'])
  })

  it('removes a block', () => {
    expect(ids(removeAt([block('a'), block('b')], 0))).toEqual(['b'])
  })

  it('duplicates a block after the original, with its own id and content', () => {
    const [first, copy, last] = duplicateAt([block('a'), block('b')], 0)
    expect(first?.id).toBe('a')
    expect(last?.id).toBe('b')
    expect(copy?.id).not.toBe('a')
    expect(copy?.content).toEqual(first?.content)
    expect(copy?.content).not.toBe(first?.content)
  })

  it('starts a new block from its schema', () => {
    const created = newBlock({
      name: 'hero',
      version: 2,
      schema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] }
    })
    expect(created).toMatchObject({ block: 'hero', schemaVersion: 2, content: { title: '' } })
  })

  it('compares drafts by content', () => {
    expect(sameBlocks([block('a')], [block('a')])).toBe(true)
    expect(sameBlocks([block('a')], [block('b')])).toBe(false)
  })

  it('describes what differs between the saved page and the draft', () => {
    const empty = { title: '', description: '', socialImageId: null }
    const seo = { en: empty, es: empty }
    const saved = { blocks: [block('a'), block('b'), block('c')], layout: 'default', seo }
    const edited = { ...block('b'), content: { title: { en: 'changed' } } }
    const draft = {
      blocks: [edited, block('d'), block('a')],
      layout: 'bare',
      seo: { ...seo, en: { ...empty, title: 'x' } }
    }
    expect(describeChanges(saved, draft)).toEqual([
      { kind: 'removed', name: 'hero', position: 3 },
      { kind: 'edited', name: 'hero', position: 1 },
      { kind: 'added', name: 'hero', position: 2 },
      { kind: 'reordered' },
      { kind: 'layout' },
      { kind: 'seo' }
    ])
    expect(describeChanges(saved, saved)).toEqual([])
  })
})
