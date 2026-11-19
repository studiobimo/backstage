import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { lastFieldValue, renderField, useStubbedListing } from './test-support.tsx'
import { parseBlockSchema, type JsonSchema } from './spec.ts'

const day: JsonSchema = {
  type: 'object',
  properties: {
    closed: { type: 'boolean' },
    opens: { type: 'string' },
    closes: { type: 'string' }
  },
  required: ['closed', 'opens', 'closes']
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const schema: JsonSchema = {
  type: 'object',
  properties: {
    hours: {
      type: 'object',
      title: 'Opening hours',
      properties: Object.fromEntries(DAYS.map((name) => [name, day])),
      required: DAYS
    }
  },
  required: ['hours']
}

const open = { closed: false, opens: '09:00', closes: '17:00' }
const week = Object.fromEntries(DAYS.map((name) => [name, open]))

describe('weekly hours', () => {
  useStubbedListing({})

  it('is chosen for an object keyed by the seven weekdays', () => {
    expect(parseBlockSchema(schema).fields[0]?.kind).toBe('weeklyHours')
    const flat: JsonSchema = {
      type: 'object',
      properties: { limits: { type: 'object', properties: { monday: day } } }
    }
    expect(parseBlockSchema(flat).fields[0]?.kind).toBe('group')
  })

  it('shows one row per day with a switch and From and To times', () => {
    renderField(schema, 'hours', week)
    expect(screen.getByRole('group', { name: /Opening hours/ })).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(7)
    expect(screen.getByLabelText('Monday, From')).toHaveValue('09:00')
    expect(screen.getByLabelText('Sunday, To')).toHaveValue('17:00')
  })

  it('writes a changed time into that day only', () => {
    const { onChange } = renderField(schema, 'hours', week)
    fireEvent.change(screen.getByLabelText('Tuesday, To'), { target: { value: '21:30' } })
    const hours = lastFieldValue(onChange, 'hours') as Record<string, typeof open>
    expect(hours.tuesday).toEqual({ ...open, closes: '21:30' })
    expect(hours.monday).toEqual(open)
  })

  it('swaps the times for Closed when a day is switched off, and keeps them', async () => {
    const { user, onChange } = renderField(schema, 'hours', week)
    await user.click(screen.getAllByRole('switch')[6]!)
    expect(screen.queryByLabelText('Sunday, From')).toBeNull()
    expect(screen.getByText('Closed')).toBeInTheDocument()
    const hours = lastFieldValue(onChange, 'hours') as Record<string, typeof open>
    expect(hours.sunday).toEqual({ ...open, closed: true })
  })

  it('operates from the keyboard', async () => {
    const { user, onChange } = renderField(schema, 'hours', week)
    screen.getAllByRole('switch')[0]!.focus()
    await user.keyboard(' ')
    const hours = lastFieldValue(onChange, 'hours') as Record<string, typeof open>
    expect(hours.monday?.closed).toBe(true)
  })
})
