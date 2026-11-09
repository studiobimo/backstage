import { createElement } from 'react'
import { renderToReadableStream } from 'react-dom/server'

import { Document, type PageProps } from './document'

const HTML_CONTENT_TYPE = 'text/html; charset=utf-8'

export async function renderPage(props: PageProps, headers: HeadersInit) {
  const stream = await renderToReadableStream(createElement(Document, props))
  await stream.allReady
  return new Response(stream, { headers: { ...headers, 'Content-Type': HTML_CONTENT_TYPE } })
}
