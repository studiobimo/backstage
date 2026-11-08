import { z } from 'zod'
import { describe, expect, it } from 'vitest'

import { richText } from './fields.ts'

const schema = richText()

const everyNode = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Menu' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Fresh ', marks: [{ type: 'bold' }, { type: 'italic' }] },
        { type: 'hardBreak' },
        {
          type: 'text',
          text: 'daily',
          marks: [{ type: 'link', attrs: { href: '/menu', target: null } }]
        }
      ]
    },
    { type: 'paragraph' },
    {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }]
    },
    {
      type: 'orderedList',
      attrs: { start: 1 },
      content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }]
    },
    { type: 'blockquote', content: [{ type: 'paragraph' }] }
  ]
}

describe('richText', () => {
  it('accepts every node and mark the editor offers', () => {
    expect(schema.safeParse(everyNode).success).toBe(true)
  })

  it('refuses a link that could run a script', () => {
    const unsafe = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]
            }
          ]
        }
      ]
    }
    expect(schema.safeParse(unsafe).success).toBe(false)
  })

  it('refuses headings, nested lists and nodes the site cannot show', () => {
    const doc = (block: object) => ({ type: 'doc', content: [block] })
    expect(schema.safeParse(doc({ type: 'heading', attrs: { level: 1 } })).success).toBe(false)
    expect(schema.safeParse(doc({ type: 'codeBlock' })).success).toBe(false)
    expect(
      schema.safeParse(
        doc({
          type: 'bulletList',
          content: [{ type: 'listItem', content: [{ type: 'bulletList', content: [] }] }]
        })
      ).success
    ).toBe(false)
  })

  it('serves as JSON Schema with no references, so the admin can read it back', () => {
    const json = z.toJSONSchema(schema, { io: 'input' })
    expect(JSON.stringify(json)).not.toContain('$ref')
    expect(json).toMatchObject({ backstage: 'richText' })
    expect(z.fromJSONSchema(json).safeParse(everyNode).success).toBe(true)
  })
})
