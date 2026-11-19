import { API_ERROR, defineForm } from '@studiobimo/backstage'
import type { SubmitResult, VisitorRpc } from '@studiobimo/backstage/site'
import { createSite } from '@studiobimo/backstage/site/hono'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { components } from '../src/blocks/component-map'
import { contactForm } from '../src/forms/contact/form'
import { FORM_ROUTE, formPathOf } from '../src/forms/route'
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

const forms = new Map([contactForm, newsletterForm].map((form) => [form.name, form]))

const submitting = (result: SubmitResult) => {
  const submit = vi.fn<VisitorRpc['submit']>(async () => result)
  const env = { ...platform.env, ADMIN: { submit } } as unknown as Env
  return { submit, env }
}

const post = (env: Env, name: string, fields: Record<string, string>) => {
  const app = createSite({ components, stylesheet: '', routes: formRoutes(forms) })
  return app.request(
    formPathOf(name),
    {
      method: 'POST',
      headers: { 'cf-connecting-ip': VISITOR_IP },
      body: new URLSearchParams(fields)
    },
    env
  )
}

describe('submitting a form by name', () => {
  it('hands the payload and the Turnstile token to the admin and returns the token', async () => {
    const { submit, env } = submitting(SENT)
    const response = await post(env, 'contact', {
      ...FIELDS,
      [FORM_ROUTE.field.turnstile]: 'pass'
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
