import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, SessionExpiredError } from './api'
import { uploadRequest } from './upload-request'

class FakeRequest {
  static last: FakeRequest
  upload: { onprogress?: (event: ProgressEvent) => void } = {}
  onload?: () => Promise<void>
  onerror?: () => void
  status = 0
  responseText = ''
  method = ''
  url = ''
  constructor() {
    FakeRequest.last = this
  }
  open(method: string, url: string) {
    this.method = method
    this.url = url
  }
  send() {}
  finish(status: number, body: unknown) {
    this.status = status
    this.responseText = JSON.stringify(body)
    return this.onload?.()
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const stubRequest = () => vi.stubGlobal('XMLHttpRequest', FakeRequest)

describe('uploadRequest', () => {
  it('posts to the API and reports how much was sent', async () => {
    stubRequest()
    const progress = vi.fn()
    const result = uploadRequest('/media', new FormData(), progress)
    FakeRequest.last.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 4 } as never)
    FakeRequest.last.upload.onprogress?.({ lengthComputable: false, loaded: 2, total: 0 } as never)
    await FakeRequest.last.finish(201, { media: {} })
    expect((await result).status).toBe(201)
    expect(FakeRequest.last).toMatchObject({ method: 'POST', url: '/api/v1/media' })
    expect(progress).toHaveBeenCalledTimes(1)
    expect(progress).toHaveBeenCalledWith(0.25)
  })

  it('rejects with the server error code', async () => {
    stubRequest()
    const result = uploadRequest('/media', new FormData(), vi.fn())
    const rejection = expect(result).rejects.toMatchObject({
      code: 'too_large',
      name: 'Error'
    })
    await FakeRequest.last.finish(413, { error: 'x', code: 'too_large' })
    await rejection
    await expect(result).rejects.toBeInstanceOf(ApiError)
  })

  it('treats a dropped connection while online as an ended session', async () => {
    stubRequest()
    const result = uploadRequest('/media', new FormData(), vi.fn())
    FakeRequest.last.onerror?.()
    await expect(result).rejects.toBeInstanceOf(SessionExpiredError)
  })

  it('treats a dropped connection while offline as a server problem', async () => {
    stubRequest()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const result = uploadRequest('/media', new FormData(), vi.fn())
    FakeRequest.last.onerror?.()
    await expect(result).rejects.toMatchObject({ code: 'internal' })
  })
})
