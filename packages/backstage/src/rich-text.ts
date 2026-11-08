import { z } from 'zod'

export const RICH_TEXT = {
  headingLevels: [2, 3],
  safeHref: /^(https?:\/\/|mailto:|tel:|\/|#)/
} as const

const link = z.object({
  type: z.literal('link'),
  attrs: z.looseObject({ href: z.string().regex(RICH_TEXT.safeHref) })
})

const mark = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bold') }),
  z.object({ type: z.literal('italic') }),
  link
])

const inline = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string().min(1), marks: z.array(mark).optional() }),
  z.object({ type: z.literal('hardBreak') })
])

const paragraph = z.object({
  type: z.literal('paragraph'),
  content: z.array(inline).optional()
})

const heading = z.object({
  type: z.literal('heading'),
  attrs: z.object({ level: z.union(RICH_TEXT.headingLevels.map((level) => z.literal(level))) }),
  content: z.array(inline).optional()
})

const listItem = z.object({ type: z.literal('listItem'), content: z.array(paragraph).min(1) })

const block = z.discriminatedUnion('type', [
  paragraph,
  heading,
  z.object({ type: z.literal('bulletList'), content: z.array(listItem).min(1) }),
  z.object({
    type: z.literal('orderedList'),
    attrs: z.looseObject({}).optional(),
    content: z.array(listItem).min(1)
  }),
  z.object({ type: z.literal('blockquote'), content: z.array(paragraph).min(1) })
])

export const richTextDoc = z.object({ type: z.literal('doc'), content: z.array(block) })

export type RichTextDoc = z.output<typeof richTextDoc>
