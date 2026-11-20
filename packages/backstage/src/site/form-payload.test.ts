import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { FORM_PAYLOAD, readFormPayload } from './form-payload.ts'

const URL_OF_FORM = 'https://site.example/forms/order'
const TOKEN = 'pass'

const schema = z.object({
  email: z.email(),
  copies: z.number().int(),
  subscribed: z.boolean(),
  note: z.string().optional(),
  items: z.array(z.object({ sku: z.string(), quantity: z.number() })),
  address: z.object({ city: z.string() }).optional()
})

const ITEMS = [{ sku: 'a-1', quantity: 2 }]

const json = (body: unknown) =>
  new Request(URL_OF_FORM, {
    method: 'POST',
    headers: { 'content-type': FORM_PAYLOAD.contentType.json },
    body: JSON.stringify(body)
  })

const multipart = (fields: Record<string, string>) => {
  const body = new FormData()
  Object.entries(fields).forEach(([key, value]) => body.set(key, value))
  return new Request(URL_OF_FORM, { method: 'POST', body })
}

describe('readFormPayload', () => {
  it('keeps nested arrays and objects from a JSON body and splits off the Turnstile token', async () => {
    const read = await readFormPayload(
      json({
        email: 'a@b.co',
        items: ITEMS,
        address: { city: 'Roatan' },
        [FORM_PAYLOAD.turnstileField]: TOKEN
      }),
      schema
    )
    expect(read).toEqual({
      payload: { email: 'a@b.co', items: ITEMS, address: { city: 'Roatan' } },
      turnstileToken: TOKEN
    })
  })

  it('coerces flat multipart fields and parses a JSON string for an array or object field', async () => {
    const read = await readFormPayload(
      multipart({
        email: 'a@b.co',
        copies: '3',
        subscribed: 'on',
        items: JSON.stringify(ITEMS),
        address: JSON.stringify({ city: 'Roatan' }),
        stray: 'dropped',
        [FORM_PAYLOAD.turnstileField]: TOKEN
      }),
      schema
    )
    expect(read).toEqual({
      payload: {
        email: 'a@b.co',
        copies: 3,
        subscribed: true,
        items: ITEMS,
        address: { city: 'Roatan' }
      },
      turnstileToken: TOKEN
    })
  })

  it('leaves a structured field as the raw string when it is not JSON, for the schema to refuse', async () => {
    const read = await readFormPayload(multipart({ items: 'not json' }), schema)
    expect(read?.payload).toEqual({ items: 'not json' })
    expect(read?.turnstileToken).toBeNull()
  })

  it.each([json([1, 2]), json(null), new Request(URL_OF_FORM, { method: 'POST', body: 'x' })])(
    'returns null for a body that is not a form or a JSON object',
    async (request) => {
      expect(await readFormPayload(request, schema)).toBeNull()
    }
  )

  it('returns null for malformed JSON', async () => {
    const request = new Request(URL_OF_FORM, {
      method: 'POST',
      headers: { 'content-type': FORM_PAYLOAD.contentType.json },
      body: '{'
    })
    expect(await readFormPayload(request, schema)).toBeNull()
  })
})
