import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { image, localized } from './fields.ts'
import { countMissingTranslations, markedFieldsIn, type TranslatedNode } from './translations.ts'

const schemaOf = (shape: z.ZodType) => z.toJSONSchema(shape, { io: 'input' }) as TranslatedNode

const imagePaths = (node: TranslatedNode, value: unknown) =>
  markedFieldsIn(node, value, 'image').map((field) => field.path)

describe('markedFieldsIn through optional, nullable and union fields', () => {
  const imageBlock = schemaOf(
    z.object({
      plain: image(),
      optional: image().optional(),
      nullable: image().nullable(),
      nullableList: z.array(image().nullable()),
      union: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('photo'), picture: image() }),
        z.object({ kind: z.literal('text'), body: z.string() })
      ])
    })
  )

  it('finds an image in each shape that has one', () => {
    const content = {
      plain: { id: 'a' },
      optional: { id: 'b' },
      nullable: { id: 'c' },
      nullableList: [{ id: 'd' }, null, { id: 'e' }],
      union: { kind: 'photo', picture: { id: 'f' } }
    }
    expect(imagePaths(imageBlock, content)).toEqual([
      'plain',
      'optional',
      'nullable',
      'nullableList[0]',
      'nullableList[2]',
      'union.picture'
    ])
  })

  it('skips null, absent and non-matching branches', () => {
    const content = {
      plain: { id: 'a' },
      nullable: null,
      nullableList: [],
      union: { kind: 'text', body: 'Hi' }
    }
    expect(imagePaths(imageBlock, content)).toEqual(['plain', 'optional'])
  })

  it('counts translations inside nullable and union fields once', () => {
    const node = schemaOf(
      z.object({
        note: localized(z.string()).nullable(),
        pick: z.union([
          z.object({ kind: z.literal('a'), title: localized(z.string()) }),
          z.object({ kind: z.literal('b'), title: localized(z.string()) })
        ])
      })
    )
    const content = { note: { en: 'Hi' }, pick: { kind: 'b', title: { en: 'One' } } }
    expect(countMissingTranslations(node, content, 'es')).toBe(2)
    expect(countMissingTranslations(node, { note: null, pick: { kind: 'a' } }, 'es')).toBe(0)
  })
})
