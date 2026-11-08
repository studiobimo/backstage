import { describe, expect, it } from 'vitest'

import { regular, send, useFreshPagesDb } from './pages-test-support'

describe('page blocks API', () => {
  useFreshPagesDb()

  const createPage = async () =>
    (
      (await (await send('POST', '', regular('about'))).json()) as {
        page: { id: string }
      }
    ).page.id
  const entry = (id: string) => ({ id, block: 'hero', schemaVersion: 1, content: { id } })

  it('saves blocks in order and reads them back', async () => {
    const id = await createPage()
    const saved = await send('PUT', `/${id}/blocks`, { blocks: [entry('b'), entry('a')] })
    expect(saved.status).toBe(200)
    const { blocks } = (await (await send('GET', `/${id}/blocks`)).json()) as {
      blocks: { id: string }[]
    }
    expect(blocks.map((block) => block.id)).toEqual(['b', 'a'])
  })

  it('replaces the blocks, and clears them', async () => {
    const id = await createPage()
    await send('PUT', `/${id}/blocks`, { blocks: [entry('a'), entry('b')] })
    await send('PUT', `/${id}/blocks`, { blocks: [entry('b')] })
    await send('PUT', `/${id}/blocks`, { blocks: [] })
    const { blocks } = (await (await send('GET', `/${id}/blocks`)).json()) as {
      blocks: unknown[]
    }
    expect(blocks).toEqual([])
  })

  it('refuses unknown blocks and repeated ids', async () => {
    const id = await createPage()
    const unknown = { ...entry('a'), block: 'nope' }
    expect((await send('PUT', `/${id}/blocks`, { blocks: [unknown] })).status).toBe(400)
    expect((await send('PUT', `/${id}/blocks`, { blocks: [entry('a'), entry('a')] })).status).toBe(
      400
    )
  })

  it('answers 404 for a page that does not exist', async () => {
    expect((await send('GET', '/missing/blocks')).status).toBe(404)
    expect((await send('PUT', '/missing/blocks', { blocks: [] })).status).toBe(404)
  })
})
