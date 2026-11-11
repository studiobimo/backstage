import type { ReactElement } from 'react'
import { renderToReadableStream } from 'react-dom/server'

const HTML_CONTENT_TYPE = 'text/html; charset=utf-8'

export async function renderHtml(element: ReactElement, headers: HeadersInit = {}) {
  const stream = await renderToReadableStream(element)
  await stream.allReady
  return new Response(stream, { headers: { ...headers, 'Content-Type': HTML_CONTENT_TYPE } })
}
