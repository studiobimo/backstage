import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { lastFieldValue, renderField, useStubbedListing } from './test-support.tsx'
import { type JsonSchema, parseBlockSchema } from './spec.ts'

const schema: JsonSchema = {
  type: 'object',
  properties: {
    price: { type: 'integer', backstage: 'money', title: 'Price' }
  }
}

const registrySettings = (currency?: string) => ({
  schema: null,
  settings: currency ? { currency } : {},
  version: 1
})

describe('money in the block schema', () => {
  it('reads a marked integer as its own kind', () => {
    expect(parseBlockSchema(schema).fields[0]).toMatchObject({ kind: 'money', key: 'price' })
  })
})

describe('MoneyField in the site currency', () => {
  useStubbedListing(registrySettings('HNL'))

  it('shows minor units as a decimal amount in the saved currency', async () => {
    renderField(schema, 'price', 123450)
    const input = await screen.findByRole('textbox', { name: 'Price' })
    await screen.findByText('Amount in HNL, the site currency')
    expect((input as HTMLInputElement).value).toMatch(/HNL.1,234\.50/)
  })

  it('stores the typed amount as whole minor units', async () => {
    const { user, onChange } = renderField(schema, 'price', undefined)
    const input = await screen.findByRole('textbox', { name: 'Price' })
    await screen.findByText('Amount in HNL, the site currency')
    await user.click(input)
    await user.type(input, '19.99')
    await user.tab()
    expect(lastFieldValue(onChange, 'price')).toBe(1999)
  })

  it('steps by one minor unit and clears to nothing', async () => {
    const { user, onChange } = renderField(schema, 'price', 1999)
    await screen.findByText('Amount in HNL, the site currency')
    await user.click(screen.getByRole('button', { name: /increase/i }))
    expect(lastFieldValue(onChange, 'price')).toBe(2000)
    await user.clear(screen.getByRole('textbox', { name: 'Price' }))
    await user.tab()
    expect(lastFieldValue(onChange, 'price')).toBeUndefined()
  })
})

describe('MoneyField without a currency setting', () => {
  useStubbedListing(registrySettings())

  it('falls back to USD', async () => {
    renderField(schema, 'price', 500)
    expect(await screen.findByRole('textbox', { name: 'Price' })).toHaveValue('$5.00')
    expect(screen.getByText('Amount in USD, the site currency')).toBeInTheDocument()
  })
})
