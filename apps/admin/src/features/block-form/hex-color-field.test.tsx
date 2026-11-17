import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { lastFieldValue, renderField, useStubbedListing } from './test-support.tsx'
import type { JsonSchema } from './spec.ts'

const schema: JsonSchema = {
  type: 'object',
  properties: {
    accent: { type: 'string', backstage: 'hexColor', title: 'Accent' }
  }
}

const swatch = () => document.querySelector<HTMLElement>('[data-slot="color-swatch"]')

describe('HexColorField', () => {
  useStubbedListing({})

  it('shows the current color in the swatch beside a text input', () => {
    renderField(schema, 'accent', '#1a2b3c')
    expect(screen.getByRole('textbox', { name: 'Accent' })).toHaveValue('#1a2b3c')
    expect(swatch()?.style.backgroundColor).toBe('rgb(26, 43, 60)')
  })

  it('leaves the swatch empty while the value is not a hex color', () => {
    renderField(schema, 'accent', '#12')
    expect(swatch()?.style.backgroundColor).toBe('')
  })

  it('writes what is typed, and clears the field when emptied', async () => {
    const { user, onChange } = renderField(schema, 'accent', '#fff')
    await user.type(screen.getByRole('textbox', { name: 'Accent' }), '0')
    expect(lastFieldValue(onChange, 'accent')).toBe('#fff0')
    await user.clear(screen.getByRole('textbox', { name: 'Accent' }))
    expect(lastFieldValue(onChange, 'accent')).toBeUndefined()
  })
})
