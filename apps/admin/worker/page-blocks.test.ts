import { describe, expect, it } from 'vitest'

import { regular, saveBlocks, send, useFreshPagesDb, versionOf } from './pages-test-support'

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
    const saved = await saveBlocks(id, [entry('b'), entry('a')])
    expect(saved.status).toBe(200)
    const { blocks } = (await (await send('GET', `/${id}/blocks`)).json()) as {
      blocks: { id: string }[]
    }
    expect(blocks.map((block) => block.id)).toEqual(['b', 'a'])
  })

  it('replaces the blocks, and clears them', async () => {
    const id = await createPage()
    await saveBlocks(id, [entry('a'), entry('b')])
    await saveBlocks(id, [entry('b')])
    await saveBlocks(id, [])
    const { blocks } = (await (await send('GET', `/${id}/blocks`)).json()) as {
      blocks: unknown[]
    }
    expect(blocks).toEqual([])
  })

  it('refuses unknown blocks and repeated ids', async () => {
    const id = await createPage()
    const unknown = { ...entry('a'), block: 'nope' }
    expect((await saveBlocks(id, [unknown])).status).toBe(400)
    expect((await saveBlocks(id, [entry('a'), entry('a')])).status).toBe(400)
  })

  it('refuses a block that belongs to a global slot', async () => {
    const id = await createPage()
    const header = { ...entry('a'), block: 'site-header' }
    expect((await saveBlocks(id, [header])).status).toBe(400)
  })

  it('refuses a save over a newer version and says who saved it', async () => {
    const id = await createPage()
    const first = await versionOf(id)
    expect((await saveBlocks(id, [entry('a')], first)).status).toBe(200)
    const stale = await saveBlocks(id, [entry('b')], first)
    expect(stale.status).toBe(409)
    const body = (await stale.json()) as {
      code: string
      current: { version: number; updatedBy: string | null }
    }
    expect(body.code).toBe('stale_version')
    expect(body.current).toMatchObject({ version: first + 1, updatedBy: 'Local developer' })
    const { blocks } = (await (await send('GET', `/${id}/blocks`)).json()) as {
      blocks: { id: string }[]
    }
    expect(blocks.map((block) => block.id)).toEqual(['a'])
  })

  it('hands out the next version after a save', async () => {
    const id = await createPage()
    const first = await versionOf(id)
    const saved = (await (await saveBlocks(id, [], first)).json()) as { version: number }
    expect(saved.version).toBe(first + 1)
    expect(await versionOf(id)).toBe(first + 1)
  })

  it('answers 404 for a page that does not exist', async () => {
    expect((await send('GET', '/missing/blocks')).status).toBe(404)
    expect((await send('PUT', '/missing/blocks', { blocks: [], expectedVersion: 1 })).status).toBe(
      404
    )
  })
})
