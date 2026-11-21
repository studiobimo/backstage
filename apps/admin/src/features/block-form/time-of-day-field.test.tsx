import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { lastFieldValue, renderField } from './test-support.tsx'
import { type JsonSchema, parseBlockSchema } from './spec.ts'

const schema: JsonSchema = {
  type: 'object',
  properties: {
    opensAt: { type: 'string', backstage: 'timeOfDay', title: 'Opens at' }
  }
}

describe('time of day in the block schema', () => {
  it('reads a marked string as its own kind', () => {
    expect(parseBlockSchema(schema).fields[0]).toMatchObject({ kind: 'timeOfDay', key: 'opensAt' })
  })
})

describe('TimeOfDayField', () => {
  it('shows the stored time in a time input', () => {
    renderField(schema, 'opensAt', '09:30')
    expect(screen.getByLabelText('Opens at')).toHaveValue('09:30')
    expect(screen.getByLabelText('Opens at')).toHaveAttribute('type', 'time')
  })

  it('stores the chosen time as HH:mm', () => {
    const { onChange } = renderField(schema, 'opensAt', undefined)
    fireEvent.change(screen.getByLabelText('Opens at'), { target: { value: '14:05' } })
    expect(lastFieldValue(onChange, 'opensAt')).toBe('14:05')
  })

  it('clears to nothing', () => {
    const { onChange } = renderField(schema, 'opensAt', '09:30')
    fireEvent.change(screen.getByLabelText('Opens at'), { target: { value: '' } })
    expect(lastFieldValue(onChange, 'opensAt')).toBeUndefined()
  })
})
