import { describe, expect, it } from 'vitest'

import indexHtml from '../index.html?raw'
import favicon from '../public/favicon.svg?raw'

describe('favicon', () => {
  it('is linked from index.html and shipped from public/', () => {
    expect(indexHtml).toContain('rel="icon" href="/favicon.svg"')
    expect(favicon).toContain('<svg')
  })
})
