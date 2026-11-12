import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiRequest } from './api'

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
