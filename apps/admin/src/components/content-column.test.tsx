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
    expect(screen.getByRole('heading', { level: 1 }).closest('.max-w-3xl')).not.toBeNull()
  })

  it('starts the breadcrumb and the page title on the same edge', async () => {
    await renderShell('/type')
    const breadcrumbColumn = screen
      .getByRole('navigation', { name: 'breadcrumb' })
      .closest('.max-w-3xl')
    const titleColumn = screen.getByRole('heading', { level: 1 }).closest('.max-w-3xl')
    const edge = (column: Element | null | undefined) =>
      column?.parentElement?.className.replace(/ (min-w-0 flex-1|flex-1 pb-10)/, '')
    expect(edge(breadcrumbColumn)).toBe(edge(titleColumn))
  })
})
