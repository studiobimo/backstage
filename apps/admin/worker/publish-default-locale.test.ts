import { describe, expect, it } from 'vitest'

import { createRegularPage, saveBlocks, useFreshPagesDb } from './pages-test-support'
import { addMedia, hero, pageKeys, publish } from './publish-test-support'

const heroWith = (content: Record<string, unknown>) => {
  const block = hero()
  return { ...block, content: { ...block.content, ...content } }
}

const refusals = {
  'an empty title': { title: {} },
  'a title written only in Spanish': { title: { es: 'Hola' } }
}

describe('publishing a block without a default-language value', () => {
  useFreshPagesDb()

  it.each(Object.entries(refusals))('refuses %s and names the field', async (_name, content) => {
    await addMedia('m1')
    const id = await createRegularPage()
    await saveBlocks(id, [heroWith(content)])
    const response = await publish(id)
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      code: 'unpublishable',
      problems: [{ reason: 'missing_default_locale', blockId: 'b1', path: Object.keys(content)[0] }]
    })
    expect(await pageKeys()).toEqual([])
  })

  it('publishes an optional body that only Spanish fills', async () => {
    await addMedia('m1')
    const id = await createRegularPage()
    await saveBlocks(id, [heroWith({ body: { es: hero().content.body.en } })])
    expect((await publish(id)).status).toBe(200)
  })

  it('publishes when the default language is filled and Spanish is not', async () => {
    await addMedia('m1')
    const id = await createRegularPage()
    await saveBlocks(id, [heroWith({ title: { en: 'Hello' } })])
    expect((await publish(id)).status).toBe(200)
  })
})
