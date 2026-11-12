import { describe, expect, it } from 'vitest'

import {
  createRegularPage,
  db,
  regular,
  send,
  useFreshPagesDb,
  versionOf
} from './pages-test-support'

describe('page rename', () => {
  useFreshPagesDb()

  const rename = (id: string, slug: string, expectedVersion: number) =>
    send('PUT', `/${id}`, { ...regular(slug), expectedVersion })

  it('refuses a stale version and changes nothing', async () => {
    const id = await createRegularPage()
    const first = await versionOf(id)
    expect((await rename(id, 'team', first)).status).toBe(200)
    const stale = await rename(id, 'other', first)
    expect(stale.status).toBe(409)
    expect(await stale.json()).toMatchObject({ code: 'stale_version' })
    expect((await send('POST', '', regular('team'))).status).toBe(409)
    expect((await send('POST', '', regular('other'))).status).toBe(201)
  })

  it('bumps the version and records the editor', async () => {
    const id = await createRegularPage()
    const first = await versionOf(id)
    await rename(id, 'team', first)
    expect(await versionOf(id)).toBe(first + 1)
    const row = await db.prepare('SELECT updated_by FROM pages WHERE id = ?').bind(id).first()
    expect(row?.updated_by).toBeTruthy()
  })

  it('keeps the version when the new slug is taken', async () => {
    await send('POST', '', regular('team'))
    const id = await createRegularPage()
    const first = await versionOf(id)
    const response = await rename(id, 'team', first)
    expect(response.status).toBe(409)
    expect(await versionOf(id)).toBe(first)
  })

  it('answers 400 without an expected version', async () => {
    const id = await createRegularPage()
    expect((await send('PUT', `/${id}`, regular('team'))).status).toBe(400)
  })
})
