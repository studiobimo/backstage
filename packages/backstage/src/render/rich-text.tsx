import { renderJSONContentToReactElement } from '@tiptap/static-renderer/json/react'
import type { ReactNode } from 'react'

import { RICH_TEXT, type RichTextDoc } from '../rich-text.ts'

const HEADING_TAG = { 2: 'h2', 3: 'h3' } as const

const render = renderJSONContentToReactElement({
  nodeMapping: {
    doc: ({ children }) => <>{children}</>,
    paragraph: ({ children }) => <p>{children}</p>,
    heading: ({ node, children }) => {
      const Tag = HEADING_TAG[node.attrs?.level as keyof typeof HEADING_TAG] ?? HEADING_TAG[2]
      return <Tag>{children}</Tag>
    },
    bulletList: ({ children }) => <ul>{children}</ul>,
    orderedList: ({ children }) => <ol>{children}</ol>,
    listItem: ({ children }) => <li>{children}</li>,
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
    hardBreak: () => <br />,
    text: ({ node }) => <>{node.text}</>
  },
  markMapping: {
    bold: ({ children }) => <strong>{children}</strong>,
    italic: ({ children }) => <em>{children}</em>,
    link: ({ mark, children }) => {
      const href = String(mark.attrs?.href ?? '')
      return RICH_TEXT.safeHref.test(href) ? <a href={href}>{children}</a> : <>{children}</>
    }
  }
})

export function RichText({ doc }: { doc: RichTextDoc | undefined }): ReactNode {
  return doc ? render({ content: doc }) : null
}
