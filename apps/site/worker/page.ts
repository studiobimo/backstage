import { createElement, type ReactElement } from 'react'
import { renderToReadableStream } from 'react-dom/server'

import { Document, type PageProps, PreviewDocument, type PreviewProps } from './document'

const HTML_CONTENT_TYPE = 'text/html; charset=utf-8'

async function respondWithHtml(element: ReactElement, headers: HeadersInit) {
  const stream = await renderToReadableStream(element)
  await stream.allReady
  return new Response(stream, { headers: { ...headers, 'Content-Type': HTML_CONTENT_TYPE } })
}

export const renderPage = (props: PageProps, headers: HeadersInit) =>
  respondWithHtml(createElement(Document, props), headers)

export const renderPreview = (props: PreviewProps, headers: HeadersInit) =>
  respondWithHtml(createElement(PreviewDocument, props), headers)
