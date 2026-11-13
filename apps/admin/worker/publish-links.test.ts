import { describe, expect, it } from 'vitest'

import { createRegularPage, saveBlocks, useFreshPagesDb } from './pages-test-support'
import { addMedia, expectPublishRefused, hero, pageKeys, publish } from './publish-test-support'

const heroLinking = (href: string) => {
  const block = hero()
  return { ...block, content: { ...block.content, cta: { en: { href, label: 'Go' } } } }
}

describe('publishing a page with unsafe links', () => {
  useFreshPagesDb()

  it.each(['javascript:alert(1)', 'data:text/html,x', 'ftp://example.com'])(
    'refuses a call to action that points at %s and names the block',
    async (href) => {
      await addMedia('m1')
      const id = await createRegularPage()
      await saveBlocks(id, [heroLinking(href)])
      await expectPublishRefused(id, [{ reason: 'invalid_content', blockId: 'b1' }])
      expect(await pageKeys()).toEqual([])
    }
  )

  it.each(['https://example.com', 'mailto:a@b.co', '/contact', '#top'])(
    'publishes a call to action that points at %s',
    async (href) => {
      await addMedia('m1')
      const id = await createRegularPage()
      await saveBlocks(id, [heroLinking(href)])
      expect((await publish(id)).status).toBe(200)
    }
  )
})
