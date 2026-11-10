import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { BlockPreviewPage } from './block-preview-page'
import { PREVIEW_SAMPLES } from './samples'

const BLOCK_NAMES = Object.keys(PREVIEW_SAMPLES)

describe('BlockPreviewPage', () => {
  it('renders every example block with its sample content', () => {
    render(<BlockPreviewPage />)
    expect(BLOCK_NAMES).toHaveLength(6)
    for (const name of BLOCK_NAMES) {
      const region = screen.getByRole('region', { name: new RegExp(name) })
      expect(region.querySelector(`[data-block="${name}"]`)).not.toBeNull()
    }
  })

  it('shows the sample copy in the chosen language and width', async () => {
    const user = userEvent.setup()
    render(<BlockPreviewPage />)
    const split = screen.getByRole('region', { name: /split-hero/ })
    expect(within(split).getByRole('heading', { level: 1 })).toHaveTextContent(
      'A headline beside the picture'
    )
    await user.click(screen.getByRole('button', { name: 'ES' }))
    expect(within(split).getByRole('heading', { level: 1 })).toHaveTextContent(
      'Un titular junto a la imagen'
    )
    await user.click(screen.getByRole('button', { name: 'Phone' }))
    expect(screen.getByRole('button', { name: 'Phone' })).toHaveAttribute('aria-pressed', 'true')
  })
})
