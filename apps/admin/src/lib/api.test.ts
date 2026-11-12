import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiRequest, SESSION_EXPIRED, SessionExpiredError } from './api'

const sentHeaders = (fetchMock: ReturnType<typeof vi.fn>) =>
  new Headers((fetchMock.mock.calls[0]![1] as RequestInit).headers)

const stubFetch = () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('apiRequest headers', () => {
  it('sends JSON by default', async () => {
    const fetchMock = stubFetch()
    await apiRequest('/pages')
    expect(sentHeaders(fetchMock).get('content-type')).toBe('application/json')
  })

  it('keeps the caller headers and adds the content type', async () => {
    const fetchMock = stubFetch()
    await apiRequest('/pages', { headers: { 'x-trace': 'abc' } })
    const headers = sentHeaders(fetchMock)
    expect(headers.get('x-trace')).toBe('abc')
    expect(headers.get('content-type')).toBe('application/json')
  })

  it('lets the caller set the content type', async () => {
    const fetchMock = stubFetch()
    await apiRequest('/pages', { headers: { 'content-type': 'application/merge+json' } })
    expect(sentHeaders(fetchMock).get('content-type')).toBe('application/merge+json')
  })

  it('leaves the content type to the browser for a FormData body', async () => {
    const fetchMock = stubFetch()
    await apiRequest('/media', { method: 'POST', body: new FormData() })
    expect(sentHeaders(fetchMock).has('content-type')).toBe(false)
  })
})

describe('apiRequest failures', () => {
  it('treats a redirect it cannot follow as an ended session', async () => {
    const redirect = Object.defineProperty(new Response(null), 'type', { value: 'opaqueredirect' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(redirect))
    const failure = await apiRequest('/pages').catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(SessionExpiredError)
    expect((failure as ApiError).code).toBe(SESSION_EXPIRED.code)
  })

  it('asks fetch not to follow redirects', async () => {
    const fetchMock = stubFetch()
    await apiRequest('/pages')
    expect((fetchMock.mock.calls[0]![1] as RequestInit).redirect).toBe('manual')
  })

  it('keeps the code of an ordinary refusal', async () => {
    const body = JSON.stringify({ error: 'Not found', code: 'not_found' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 404 })))
    const failure = await apiRequest('/pages/x').catch((error: unknown) => error)
    expect(failure).not.toBeInstanceOf(SessionExpiredError)
    expect((failure as ApiError).code).toBe('not_found')
  })
})
