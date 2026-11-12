import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { BlockForm } from './block-form.tsx'
import type { JsonSchema } from './spec.ts'

const LIST = { itemCount: 12, invalidNumber: 11 } as const

const listSchema = z.toJSONSchema(
  z.object({ items: z.array(z.object({ name: z.string().min(1) })) }),
  { io: 'input' }
) as JsonSchema

const itemsWithOneBlank = Array.from({ length: LIST.itemCount }, (_, index) => ({
  name: index + 1 === LIST.invalidNumber ? '' : `Name ${index + 1}`
}))

const itemTrigger = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })

async function submitInvalidList() {
  const user = userEvent.setup({ delay: null })
  render(<BlockForm schema={listSchema} locales={['en']} value={{ items: itemsWithOneBlank }} />)
  await screen.findByRole('button', { name: 'Reorder Name 1' })
  await user.click(screen.getByRole('button', { name: 'Save' }))
  return user
}

describe('BlockForm list items with errors', () => {
  afterEach(cleanup)

  it('flags only the eleventh of twelve items', async () => {
    await submitInvalidList()
    const flagged = screen.getAllByLabelText('Has errors')
    expect(flagged).toHaveLength(1)
    expect(itemTrigger(`Item ${LIST.invalidNumber}`)).toContainElement(flagged[0])
    expect(itemTrigger('Name 2')).toHaveAttribute('aria-expanded', 'false')
    expect(itemTrigger(`Item ${LIST.invalidNumber}`)).toHaveAttribute('aria-expanded', 'true')
  })

  it('lets an invalid item be collapsed and keeps its error icon', async () => {
    const user = await submitInvalidList()
    await user.click(itemTrigger(`Item ${LIST.invalidNumber}`))
    expect(itemTrigger(`Item ${LIST.invalidNumber}`)).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByLabelText('Has errors')).toHaveLength(1)
  })
})
