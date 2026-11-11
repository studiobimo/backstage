import { renderHtml } from '@studiobimo/backstage/site'
import { createElement } from 'react'

import { Document, type PageProps, PreviewDocument, type PreviewProps } from './document'

export const renderPage = (props: PageProps, headers: HeadersInit) =>
  renderHtml(createElement(Document, props), headers)

export const renderPreview = (props: PreviewProps, headers: HeadersInit) =>
  renderHtml(createElement(PreviewDocument, props), headers)
