import { describe, expect, it } from 'vitest'

import { regular, send, useFreshPagesDb } from './pages-test-support'

const createPage = async () =>
  ((await (await send('POST', '', regular('about'))).json()) as { page: { id: string } }).page.id

const layoutOf = async (id: string) => {
  const { pages } = (await (await send('GET', '')).json()) as {
    pages: { id: string; layout: string }[]
  }
  return pages.find((page) => page.id === id)?.layout
}

describe('page layout API', () => {
  useFreshPagesDb()

  it('starts on the default layout', async () => {
    expect(await layoutOf(await createPage())).toBe('default')
  })

  it('saves a registered layout and keeps it across a rename', async () => {
    const id = await createPage()
    expect((await send('PUT', `/${id}/layout`, { layout: 'minimal' })).status).toBe(200)
    await send('PUT', `/${id}`, regular('team'))
    expect(await layoutOf(id)).toBe('minimal')
  })

  it('refuses a layout the registry does not have', async () => {
    const id = await createPage()
    expect((await send('PUT', `/${id}/layout`, { layout: 'nope' })).status).toBe(400)
    expect(await layoutOf(id)).toBe('default')
  })

  it('answers 404 for a page that does not exist', async () => {
    expect((await send('PUT', '/missing/layout', { layout: 'bare' })).status).toBe(404)
  })
})
