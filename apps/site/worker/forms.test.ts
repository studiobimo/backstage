import { API_ERROR, defineForm, type Form } from '@studiobimo/backstage'
import {
  EDGE_CACHE,
  FORM_PAYLOAD,
  formProjectionKey,
  type StatusResult,
  type SubmitResult,
  type VisitorRpc
} from '@studiobimo/backstage/site'
import { createSite, RATE_LIMIT } from '@studiobimo/backstage/site/hono'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { components } from '../src/blocks/component-map'
import { contactForm } from '../src/forms/contact/form'
import { FORM_ROUTE, formPathOf, formProjectionPathOf, formStatusPathOf } from '../src/forms/route'
import { formRoutes } from './forms'
import { platform } from './test-support'

afterAll(() => platform.dispose())

const VISITOR_IP = '203.0.113.7'
const SENT = { ok: true, id: 'sub-1', token: 'a1'.repeat(24) } as const
const FIELDS = { name: 'Ana Pérez', email: 'ana@example.com', message: 'Hello there' }

const newsletterForm = defineForm('newsletter', {
  schema: z.object({
    email: z.email(),
    copies: z.number().int(),
    subscribed: z.boolean(),
    nickname: z.string().optional()
  })
})

const orderForm = defineForm('order', {
  schema: z.object({
    email: z.email(),
    items: z.array(z.object({ sku: z.string(), quantity: z.number().int() }))
  })
})

const forms = new Map<string, Form>(
  [contactForm, newsletterForm, orderForm].map((form) => [form.name, form])
)
const registry = { forms, getForm: (name: string) => forms.get(name) }
const allowing = { limit: async () => ({ success: true }) }
const refusing = { limit: async () => ({ success: false }) }

const envWith = (admin: Partial<VisitorRpc>, limiter = allowing) =>
  ({ ...platform.env, ADMIN: admin, FORM_LIMITER: limiter }) as unknown as Env

const submitting = (result: SubmitResult, limiter = allowing) => {
  const submit = vi.fn<VisitorRpc['submit']>(async () => result)
  return { submit, env: envWith({ submit }, limiter) }
}

const siteOf = () => createSite({ components, stylesheet: '', routes: formRoutes(registry) })

const post = (env: Env, name: string, fields: Record<string, string>) =>
  siteOf().request(
    formPathOf(name),
    {
      method: 'POST',
      headers: { 'cf-connecting-ip': VISITOR_IP },
      body: new URLSearchParams(fields)
    },
    env
  )

describe('submitting a form by name', () => {
  it('hands the payload and the Turnstile token to the admin and returns the token', async () => {
    const { submit, env } = submitting(SENT)
    const response = await post(env, 'contact', {
      ...FIELDS,
      [FORM_PAYLOAD.turnstileField]: 'pass'
    })
    expect(response.status).toBe(FORM_ROUTE.status.created)
    expect(await response.json()).toEqual({ id: SENT.id, token: SENT.token })
    expect(submit).toHaveBeenCalledWith(
      { ip: VISITOR_IP, country: null },
      'contact',
      FIELDS,
      'pass'
    )
  })

  it('sends no token when the widget did not add one', async () => {
    const { submit, env } = submitting(SENT)
    await post(env, 'contact', FIELDS)
    expect(submit.mock.calls[0]?.[3]).toBeNull()
  })

  it('answers an unknown form as not found without calling the admin', async () => {
    const { submit, env } = submitting(SENT)
    const response = await post(env, 'missing', FIELDS)
    expect(response.status).toBe(API_ERROR.notFound.status)
    expect(((await response.json()) as { code: string }).code).toBe(API_ERROR.notFound.code)
    expect(submit).not.toHaveBeenCalled()
  })

  it('answers a schema mismatch with the field issues', async () => {
    const issues = [{ path: ['email'], code: 'invalid_format' }]
    const { env } = submitting({ ok: false, code: 'invalid', issues })
    const response = await post(env, 'contact', { ...FIELDS, email: 'nope' })
    expect(response.status).toBe(API_ERROR.invalid.status)
    expect(await response.json()).toEqual({
      code: API_ERROR.invalid.code,
      error: API_ERROR.invalid.message,
      issues
    })
  })

  it('answers a rejected Turnstile token as forbidden', async () => {
    const { env } = submitting({ ok: false, code: 'turnstile_failed', issues: [] })
    const response = await post(env, 'contact', FIELDS)
    expect(response.status).toBe(API_ERROR.turnstileFailed.status)
    expect(((await response.json()) as { code: string }).code).toBe(API_ERROR.turnstileFailed.code)
  })

  it('routes a second form through the same handler and coerces by its schema', async () => {
    const { submit, env } = submitting(SENT)
    const response = await post(env, 'newsletter', {
      email: 'ana@example.com',
      copies: '3',
      subscribed: 'on',
      extra: 'dropped'
    })
    expect(response.status).toBe(FORM_ROUTE.status.created)
    expect(submit).toHaveBeenCalledWith(
      expect.anything(),
      'newsletter',
      { email: 'ana@example.com', copies: 3, subscribed: true },
      null
    )
  })
})

describe('submitting as JSON', () => {
  const postJson = (env: Env, body: unknown) =>
    siteOf().request(
      formPathOf('order'),
      {
        method: 'POST',
        headers: { 'content-type': FORM_PAYLOAD.contentType.json, 'cf-connecting-ip': VISITOR_IP },
        body: JSON.stringify(body)
      },
      env
    )

  it('keeps a nested array and takes the Turnstile token from the body', async () => {
    const { submit, env } = submitting(SENT)
    const items = [{ sku: 'a-1', quantity: 2 }]
    const response = await postJson(env, {
      email: 'ana@example.com',
      items,
      [FORM_PAYLOAD.turnstileField]: 'pass'
    })
    expect(response.status).toBe(FORM_ROUTE.status.created)
    expect(submit).toHaveBeenCalledWith(
      { ip: VISITOR_IP, country: null },
      'order',
      { email: 'ana@example.com', items },
      'pass'
    )
  })

  it('accepts a JSON string for an array field in a multipart body', async () => {
    const { submit, env } = submitting(SENT)
    const items = [{ sku: 'b-2', quantity: 1 }]
    await post(env, 'order', { email: 'ana@example.com', items: JSON.stringify(items) })
    expect(submit.mock.calls[0]?.[2]).toEqual({ email: 'ana@example.com', items })
  })

  it('answers a body that is not an object as invalid without calling the admin', async () => {
    const { submit, env } = submitting(SENT)
    const response = await postJson(env, [1, 2])
    expect(response.status).toBe(API_ERROR.invalid.status)
    expect(submit).not.toHaveBeenCalled()
  })
})

describe('rate limiting', () => {
  it('refuses a submit over the limit with Retry-After and does not call the admin', async () => {
    const { submit, env } = submitting(SENT, refusing)
    const response = await post(env, 'contact', FIELDS)
    expect(response.status).toBe(API_ERROR.tooManyRequests.status)
    expect(response.headers.get(RATE_LIMIT.retryAfter.header)).toBe(
      String(RATE_LIMIT.retryAfter.seconds)
    )
    expect(submit).not.toHaveBeenCalled()
  })

  it('refuses a status read over the limit and does not call the admin', async () => {
    const status = vi.fn<VisitorRpc['status']>()
    const response = await siteOf().request(
      formStatusPathOf('contact', TOKEN),
      {},
      envWith({ status }, refusing)
    )
    expect(response.status).toBe(API_ERROR.tooManyRequests.status)
    expect(status).not.toHaveBeenCalled()
  })
})

const TOKEN = 'a1'.repeat(24)
const FOUND: StatusResult = {
  ok: true,
  form: 'contact',
  status: 'confirmed',
  fields: { name: 'Ana Pérez' }
}

const reading = (result: StatusResult) => {
  const status = vi.fn<VisitorRpc['status']>(async () => result)
  return { status, env: envWith({ status }) }
}

describe('reading a status', () => {
  it('returns the status and public fields, privately and uncached', async () => {
    const { status, env } = reading(FOUND)
    const response = await siteOf().request(
      formStatusPathOf('contact', TOKEN),
      { headers: { 'cf-connecting-ip': VISITOR_IP } },
      env
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe(EDGE_CACHE.form.status)
    expect(await response.json()).toEqual({ status: 'confirmed', fields: { name: 'Ana Pérez' } })
    expect(status).toHaveBeenCalledWith({ ip: VISITOR_IP, country: null }, TOKEN)
  })

  it('answers an unknown token as not found', async () => {
    const { env } = reading({ ok: false, code: API_ERROR.notFound.code })
    const response = await siteOf().request(formStatusPathOf('contact', TOKEN), {}, env)
    expect(response.status).toBe(API_ERROR.notFound.status)
  })

  it('does not read another form submission through this form', async () => {
    const { env } = reading({ ...FOUND, form: 'newsletter' })
    const response = await siteOf().request(formStatusPathOf('contact', TOKEN), {}, env)
    expect(response.status).toBe(API_ERROR.notFound.status)
  })

  it('answers an unknown form as not found without calling the admin', async () => {
    const { status, env } = reading(FOUND)
    const response = await siteOf().request(formStatusPathOf('missing', TOKEN), {}, env)
    expect(response.status).toBe(API_ERROR.notFound.status)
    expect(status).not.toHaveBeenCalled()
  })
})

describe('reading a projection', () => {
  const PROJECTION = {
    format: 1,
    form: 'contact',
    publishedAt: 1,
    entries: [{ name: 'Ana Pérez', message: 'private' }]
  }

  it('returns the projected entries with a short public cache', async () => {
    await platform.env.SITE!.put(formProjectionKey('contact'), JSON.stringify(PROJECTION))
    const response = await siteOf().request(formProjectionPathOf('contact'), {}, envWith({}))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe(EDGE_CACHE.form.projection)
    const body = (await response.json()) as { publishedAt: number; entries: unknown[] }
    expect(body.publishedAt).toBe(PROJECTION.publishedAt)
    expect(body.entries).toHaveLength(1)
  })

  it('answers a form with no projection as not found', async () => {
    const response = await siteOf().request(formProjectionPathOf('newsletter'), {}, envWith({}))
    expect(response.status).toBe(API_ERROR.notFound.status)
  })
})
