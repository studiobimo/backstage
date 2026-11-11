import { renderToReadableStream } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Blocks } from './blocks.tsx'
import { components, RENDERED_HTML, snapshot } from './blocks-fixture.tsx'

describe('Blocks on the server', () => {
  it('streams known blocks, skipping slot, unknown, invalid and component-less ones', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const stream = await renderToReadableStream(
      <Blocks components={components} snapshot={snapshot} />
    )
    expect(await new Response(stream).text()).toBe(RENDERED_HTML)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('banner'))
  })
})
