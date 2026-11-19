import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { lastFieldValue, renderField, useStubbedListing } from './test-support.tsx'
import { parseBlockSchema, type JsonSchema } from './spec.ts'

const schema: JsonSchema = {
  type: 'object',
  properties: {
    hours: { type: 'object', title: 'Opening hours', backstage: 'weeklyHours' }
  },
  required: ['hours']
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const empty = {
  timeZone: 'Europe/Madrid',
  week: Object.fromEntries(DAYS.map((day) => [day, []])),
  exceptions: []
}

const range = { open: '09:00', close: '17:00' }

const withMonday = { ...empty, week: { ...empty.week, monday: [range] } }

type Schedule = typeof empty & { week: Record<string, unknown[]> }

const hoursOf = (onChange: Parameters<typeof lastFieldValue>[0]) =>
  lastFieldValue(onChange, 'hours') as Schedule

describe('schedule field', () => {
  useStubbedListing({})

  it('is chosen for a field marked weeklyHours', () => {
    expect(parseBlockSchema(schema).fields[0]?.kind).toBe('schedule')
  })

  it('shows a switch per day, the time zone and an exceptions list', () => {
    renderField(schema, 'hours', withMonday)
    expect(screen.getAllByRole('switch')).toHaveLength(7)
    expect(screen.getByLabelText('Monday, hours 1, From')).toHaveValue('09:00')
    expect(screen.getByRole('button', { name: 'Add exception' })).toBeInTheDocument()
    expect(screen.getByText('Europe/Madrid')).toBeInTheDocument()
  })

  it('opens a day with default hours from the switch and closes it again', async () => {
    const { user, onChange } = renderField(schema, 'hours', empty)
    await user.click(screen.getAllByRole('switch')[1]!)
    expect(hoursOf(onChange).week.tuesday).toEqual([range])
    await user.click(screen.getAllByRole('switch')[1]!)
    expect(hoursOf(onChange).week.tuesday).toEqual([])
  })

  it('adds and removes a second range on a day', async () => {
    const { user, onChange } = renderField(schema, 'hours', withMonday)
    await user.click(screen.getByRole('button', { name: 'Add hours for Monday' }))
    expect(hoursOf(onChange).week.monday).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Remove hours 1 for Monday' }))
    expect(hoursOf(onChange).week.monday).toHaveLength(1)
  })

  it('writes a changed time into that range only', () => {
    const { onChange } = renderField(schema, 'hours', withMonday)
    fireEvent.change(screen.getByLabelText('Monday, hours 1, To'), { target: { value: '21:30' } })
    expect(hoursOf(onChange).week.monday).toEqual([{ ...range, close: '21:30' }])
  })

  it('adds an exception with a date, then removes it', async () => {
    const { user, onChange } = renderField(schema, 'hours', empty)
    await user.click(screen.getByRole('button', { name: 'Add exception' }))
    fireEvent.change(screen.getByLabelText('Exception 1, date'), {
      target: { value: '2025-12-25' }
    })
    expect(hoursOf(onChange).exceptions).toEqual([{ date: '2025-12-25', ranges: [] }])
    await user.click(screen.getByRole('button', { name: 'Remove Exception 1' }))
    expect(hoursOf(onChange).exceptions).toEqual([])
  })

  it('operates from the keyboard', async () => {
    const { user, onChange } = renderField(schema, 'hours', empty)
    screen.getAllByRole('switch')[0]!.focus()
    await user.keyboard(' ')
    expect(hoursOf(onChange).week.monday).toEqual([range])
  })
})
