import { describe, expect, it, vi } from 'vitest'

import { RPC } from '../rpc.ts'
import { SUBMISSION } from '../submissions.ts'
import type { RequestContext, VisitorRpc } from '../rpc.ts'
import { adminRpc, requestContextOf } from './rpc.ts'

const VISITOR: RequestContext = { ip: '203.0.113.7', country: 'ES' }

const requestFrom = (ip: string | null, country: string | undefined) => {
  const request = new Request('https://example.com/', {
    headers: ip === null ? {} : { [RPC.context.ipHeader]: ip }
  })
  Object.defineProperty(request, 'cf', { value: country === undefined ? undefined : { country } })
  return request
}

const SUBMITTED = { ok: true as const, id: 'sub-1', token: 'a'.repeat(SUBMISSION.token.length) }
const FOUND = { ok: true as const, form: 'reservation', status: 'new', fields: { seats: 2 } }

const bindingEchoing = (): VisitorRpc => ({
  ping: vi.fn(async (context: RequestContext) => ({ ok: true as const, context })),
  submit: vi.fn(async () => SUBMITTED),
  status: vi.fn(async () => FOUND)
})

describe('requestContextOf', () => {
  it('reads the visitor address and country from the request', () => {
    expect(requestContextOf(requestFrom(VISITOR.ip, VISITOR.country!))).toEqual(VISITOR)
  })

  it('has nulls for what the request does not carry', () => {
    expect(requestContextOf(requestFrom(null, undefined))).toEqual({ ip: null, country: null })
  })
})

describe('adminRpc', () => {
  it('sends the context and returns the validated result', async () => {
    const binding = bindingEchoing()
    expect(await adminRpc(binding).ping(VISITOR)).toEqual({ ok: true, context: VISITOR })
    expect(binding.ping).toHaveBeenCalledWith(VISITOR)
  })

  it('refuses an invalid context before calling the admin', async () => {
    const binding = bindingEchoing()
    await expect(adminRpc(binding).ping({ ip: '', country: 'ESP' })).rejects.toThrow()
    expect(binding.ping).not.toHaveBeenCalled()
  })

  it('refuses a malformed answer', async () => {
    const binding: VisitorRpc = {
      ...bindingEchoing(),
      ping: async () => ({ ok: false }) as unknown as Awaited<ReturnType<VisitorRpc['ping']>>
    }
    await expect(adminRpc(binding).ping(VISITOR)).rejects.toThrow()
  })
})

describe('adminRpc forms', () => {
  it('sends a submission with the visitor context and returns the validated result', async () => {
    const binding = bindingEchoing()
    const result = await adminRpc(binding).submit(VISITOR, 'reservation', { seats: 2 }, 'captcha')
    expect(result).toEqual(SUBMITTED)
    expect(binding.submit).toHaveBeenCalledWith(VISITOR, 'reservation', { seats: 2 }, 'captcha')
  })

  it('refuses an empty form name before calling the admin', async () => {
    const binding = bindingEchoing()
    await expect(adminRpc(binding).submit(VISITOR, '', {}, null)).rejects.toThrow()
    expect(binding.submit).not.toHaveBeenCalled()
  })

  it('refuses a token that does not look like one in the answer', async () => {
    const binding: VisitorRpc = {
      ...bindingEchoing(),
      submit: async () => ({ ok: true, id: 'x', token: 'short' })
    }
    await expect(adminRpc(binding).submit(VISITOR, 'reservation', {}, null)).rejects.toThrow()
  })

  it('asks for a status with the visitor context', async () => {
    const binding = bindingEchoing()
    expect(await adminRpc(binding).status(VISITOR, 'token')).toEqual(FOUND)
    expect(binding.status).toHaveBeenCalledWith(VISITOR, 'token')
  })
})
