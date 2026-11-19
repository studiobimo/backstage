import { createTestHarness } from 'wrangler'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { RPC } from '../../src/rpc.ts'
import { PATH } from './paths.ts'

const WORKER = { admin: 'rpc-admin', site: 'rpc-site', binding: 'ADMIN' } as const
const COMPATIBILITY = {
  compatibility_date: '2026-10-24',
  compatibility_flags: ['nodejs_compat']
} as const
const START_TIMEOUT_MS = 60_000
const COUNTRY_CODE = /^[A-Z0-9]{2}$/

const harness = createTestHarness({
  root: import.meta.dirname,
  workers: [
    {
      config: {
        name: WORKER.site,
        main: './site-worker.ts',
        ...COMPATIBILITY,
        services: [
          {
            binding: WORKER.binding,
            service: WORKER.admin,
            entrypoint: RPC.entrypoint.className
          }
        ]
      }
    },
    { config: { name: WORKER.admin, main: './admin-worker.ts', ...COMPATIBILITY } }
  ]
})

const callSite = (path: string) => harness.fetch(`http://site.test${path}`)

describe('the site calls the admin entrypoint through a service binding', () => {
  beforeAll(async () => {
    await harness.listen()
  }, START_TIMEOUT_MS)
  afterAll(() => harness.close())

  it('round-trips a validated call with the visitor address and country', async () => {
    const response = await callSite(PATH.ping)
    expect(await response.json()).toEqual({
      ok: true,
      context: { ip: expect.any(String), country: expect.stringMatching(COUNTRY_CODE) }
    })
  })

  it('refuses a context that fails the entrypoint validation', async () => {
    const response = await callSite(PATH.invalidContext)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: expect.stringContaining(RPC.errors.invalidContext)
    })
  })

  it('cannot reach the admin over http through the entrypoint', async () => {
    const response = await callSite(PATH.http)
    expect(response.status).toBe(500)
  })
})
