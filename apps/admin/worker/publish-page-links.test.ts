import { snapshotKey } from '@studiobimo/backstage/site'
import { describe, expect, it } from 'vitest'

import {
  createPage,
  hrefIn,
  linkingAdmin,
  publishWith,
  saveLinkingTo
} from './page-links-test-support'
import { kv, sendTo, useFreshPagesDb } from './pages-test-support'

describe('publishing a page that links to another page', () => {
  useFreshPagesDb()

  it('writes the address of the linked page for each language', async () => {
    const target = await createPage('contact')
    expect((await publishWith(target)()).status).toBe(200)
    const id = await createPage('about')
    await saveLinkingTo(id, target)
    expect((await publishWith(id)()).status).toBe(200)
    expect(await hrefIn(id, 'en')).toBe('/contact')
    expect(await hrefIn(id, 'es')).toBe('/es/contact-es')
  })

  it('refuses a link to a page that is not published and names the block', async () => {
    const target = await createPage('contact')
    const id = await createPage('about')
    await saveLinkingTo(id, target)
    const response = await publishWith(id)()
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      code: 'unpublishable',
      problems: [{ reason: 'unpublished_page_link', blockId: 'b1', path: 'cta.en' }]
    })
    expect(await kv.get(snapshotKey(id, 'en'))).toBeNull()
  })

  it('refuses a link to a page that was unpublished after it was linked', async () => {
    const target = await createPage('contact')
    await publishWith(target)()
    const id = await createPage('about')
    await saveLinkingTo(id, target)
    await sendTo(linkingAdmin, 'DELETE', `/pages/${target}/publish`)
    expect((await publishWith(id)()).status).toBe(422)
  })
})
