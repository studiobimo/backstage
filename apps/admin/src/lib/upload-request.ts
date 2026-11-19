import { API_ERROR } from '@studiobimo/backstage'

import { API_ROOT, ApiError, failureFrom, SessionExpiredError } from './api'

const connectionFailure = () =>
  navigator.onLine
    ? new SessionExpiredError()
    : new ApiError(API_ERROR.internal.code, API_ERROR.internal.message)

export const uploadRequest = (
  path: string,
  body: FormData,
  onProgress: (fraction: number) => void
) =>
  new Promise<Response>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${API_ROOT.v1}${path}`)
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    request.onerror = () => reject(connectionFailure())
    request.onload = async () => {
      const response = new Response(request.responseText, { status: request.status })
      if (response.ok) resolve(response)
      else reject(await failureFrom(response))
    }
    request.send(body)
  })
