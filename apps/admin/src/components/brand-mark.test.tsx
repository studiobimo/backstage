import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { brandMarkDots } from '@/lib/brand-mark'

import { BrandMark } from './brand-mark'

describe('BrandMark', () => {
  it('draws one circle per dot of the shared grid', () => {
    const { container } = render(<BrandMark />)
    expect(container.querySelectorAll('circle')).toHaveLength(brandMarkDots().length)
  })

  it('is decorative, takes its colour from the text and accepts a class', () => {
    const { container } = render(<BrandMark className="size-4" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('fill', 'currentColor')
    expect(svg).toHaveClass('size-4')
  })
})
