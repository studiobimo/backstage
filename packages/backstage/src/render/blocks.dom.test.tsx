import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import { Blocks } from './blocks.tsx'
import { components, RENDERED_HTML, snapshot } from './blocks-fixture.tsx'

describe('Blocks in the browser', () => {
  it('renders the same blocks as on the server', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const container = document.createElement('div')
    await act(async () => {
      createRoot(container).render(<Blocks components={components} snapshot={snapshot} />)
    })
    expect(container.innerHTML).toBe(RENDERED_HTML)
  })
})
