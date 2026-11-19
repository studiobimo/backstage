import { describe, expect, it, vi } from 'vitest'

import { RPC } from '../rpc.ts'
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

const bindingEchoing = (): VisitorRpc => ({
  ping: vi.fn(async (context: RequestContext) => ({ ok: true as const, context }))
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
      ping: async () => ({ ok: false }) as unknown as Awaited<ReturnType<VisitorRpc['ping']>>
    }
    await expect(adminRpc(binding).ping(VISITOR)).rejects.toThrow()
  })
})
