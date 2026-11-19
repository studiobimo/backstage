import { createAdmin, type AdminEnv } from '@studiobimo/backstage/admin'
import { createAdminEntrypoint } from '@studiobimo/backstage/admin/entrypoint'
import { testRegistry } from './test-registry'
import { vi } from 'vitest'

import { db, kv, sendTo } from './pages-test-support'

vi.mock('cloudflare:workers', () => ({
  WorkerEntrypoint: class {
    ctx: unknown
    env: unknown

    constructor(ctx: unknown, env: unknown) {
      this.ctx = ctx
      this.env = env
    }
  }
}))

export const VISITOR = { ip: '203.0.113.7', country: 'ES' }
export const TURNSTILE_TOKEN = 'good-token'
export const OWNER = 'owner@example.com'
export const SENDER = 'noreply@example.com'

export const reservation = {
  seats: 4,
  date: '2026-12-24',
  time: '20:30',
  name: ' Ana Pérez ',
  phone: '+34 600 000 000'
}

export const email = { send: vi.fn(async () => undefined) }

const entrypointEnv = (overrides: Partial<AdminEnv> = {}) =>
  ({
    DB: db,
    SITE: kv,
    TURNSTILE_SECRET: 'secret',
    OWNER_EMAIL: OWNER,
    AUTH_EMAIL_FROM: SENDER,
    EMAIL: email,
    ...overrides
  }) as unknown as AdminEnv

export const entrypointWith = (overrides: Partial<AdminEnv> = {}) => {
  const Entrypoint = createAdminEntrypoint(testRegistry)
  return new Entrypoint({} as ExecutionContext, entrypointEnv(overrides))
}

export const submit = (
  payload: unknown,
  token: string | null = TURNSTILE_TOKEN,
  form = 'reservation'
) => entrypointWith().submit(VISITOR, form, payload, token)

export const submitted = async () =>
  (await submit(reservation)) as { ok: true; id: string; token: string }

export const answerTurnstile = (success: boolean) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({ success, 'error-codes': success ? [] : ['invalid-input-response'] })
    )
  )

const admin = createAdmin(testRegistry)

export const publishedDish = async (name = 'Paella') => {
  const created = (await (
    await sendTo(admin, 'POST', '/collections/menu/entries', {
      content: { name: { en: name, es: name } }
    })
  ).json()) as { entry: { id: string; version: number } }
  const { id, version } = created.entry
  await sendTo(admin, 'POST', `/collections/menu/entries/${id}/publish`, {
    expectedVersion: version
  })
  return id
}

export const draftDish = async () => {
  const created = (await (
    await sendTo(admin, 'POST', '/collections/menu/entries', {
      content: { name: { en: 'Draft', es: 'Borrador' } }
    })
  ).json()) as { entry: { id: string } }
  return created.entry.id
}

export const storedSubmissions = async () =>
  (await db.prepare('SELECT * FROM submissions ORDER BY created_at').all()).results

export const sendForms = (path: string, method = 'GET', body?: unknown) =>
  sendTo(admin, method, path, body)
