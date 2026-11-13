import { Hono } from 'hono'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { observe, reportError } from './observability.ts'

const buildApp = () => {
  const app = new Hono()
  app.use(...observe)
  app.get('/ok', (c) => c.text('ok'))
  app.get('/boom', () => {
    throw new Error('boom')
  })
  app.onError((error, c) => {
    reportError(c, error)
    return c.text('failed', 500)
  })
  return app
}

const loggedLines = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.map(([line]) => JSON.parse(line as string))

afterEach(() => vi.restoreAllMocks())

describe('observe', () => {
  it('sends a request id and logs the request with it', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const response = await buildApp().request('/ok')
    const requestId = response.headers.get('X-Request-Id')
    expect(requestId).toBeTruthy()
    expect(loggedLines(info)).toEqual([
      expect.objectContaining({ requestId, method: 'GET', path: '/ok', status: 200 })
    ])
  })

  it('gives each request its own id', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const app = buildApp()
    const first = await app.request('/ok')
    const second = await app.request('/ok')
    expect(first.headers.get('X-Request-Id')).not.toBe(second.headers.get('X-Request-Id'))
  })

  it('logs an error with the same request id as its request line', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await buildApp().request('/boom')
    const requestId = response.headers.get('X-Request-Id')
    expect(loggedLines(error)).toEqual([
      expect.objectContaining({ requestId, level: 'error', message: 'boom' })
    ])
    expect(loggedLines(info)).toEqual([expect.objectContaining({ requestId, status: 500 })])
  })
})
