import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderShell, resetShell, stubApi } from '@/test/shell'

describe('content column', () => {
  afterEach(resetShell)

  it('gives lists a wide column', async () => {
    stubApi()
    await renderShell('/pages')
    expect(screen.getByRole('heading', { level: 1 }).closest('.max-w-6xl')).not.toBeNull()
  })

  it('gives other screens a narrow column', async () => {
    await renderShell('/type')
    expect(screen.getByRole('heading', { level: 1 }).closest('.max-w-4xl')).not.toBeNull()
  })

  it('starts the breadcrumb and the page title on the same edge', async () => {
    await renderShell('/type')
    const breadcrumbColumn = screen
      .getByRole('navigation', { name: 'breadcrumb' })
      .closest('.max-w-6xl')
    const titleColumn = screen.getByRole('heading', { level: 1 }).closest('.max-w-4xl')
    const edge = (column: Element | null | undefined) =>
      column?.parentElement?.className.replace(' flex-1 pb-10', '')
    expect(edge(breadcrumbColumn)).toBe(edge(titleColumn))
  })

  it('ends the header and wide pages on the same right edge', async () => {
    stubApi()
    await renderShell('/pages')
    const headerColumn = screen
      .getByRole('navigation', { name: 'breadcrumb' })
      .closest('.max-w-6xl')
    const titleColumn = screen.getByRole('heading', { level: 1 }).closest('.max-w-6xl')
    expect(headerColumn?.className).toBe(titleColumn?.className)
  })
})
