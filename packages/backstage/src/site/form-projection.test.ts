import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { defineBlock, defineRegistry } from '../blocks.ts'
import { FORM_PROJECTION, formProjectionKey } from '../form-projection.ts'
import { defineForm } from '../forms.ts'
import { findFormProjection, type KvReader } from './store.ts'

const reservation = defineForm('reservation', {
  schema: z.object({ seats: z.number(), date: z.string(), phone: z.string() }),
  public: { statuses: ['confirmed'], fields: ['seats', 'date'] }
})
const registry = defineRegistry(
  [defineBlock({ name: 'note', schema: z.object({ text: z.string() }) })],
  { forms: [reservation] }
)

const kvOf = (stored: unknown): KvReader =>
  ({
    get: async (key: string) => (key === formProjectionKey('reservation') ? stored : null)
  }) as KvReader

const projection = (entries: Record<string, unknown>[]) => ({
  format: FORM_PROJECTION.format,
  form: 'reservation',
  publishedAt: 5,
  entries
})

describe('findFormProjection', () => {
  it('returns the entries and when they were published', async () => {
    const stored = projection([{ seats: 2, date: '2026-12-24' }])
    expect(await findFormProjection(kvOf(stored), registry, 'reservation')).toEqual({
      publishedAt: 5,
      entries: [{ seats: 2, date: '2026-12-24' }]
    })
  })

  it('drops a field the form does not list as public', async () => {
    const stored = projection([{ seats: 2, date: '2026-12-24', phone: '+34 600 000 000' }])
    const read = await findFormProjection(kvOf(stored), registry, 'reservation')
    expect(read?.entries).toEqual([{ seats: 2, date: '2026-12-24' }])
  })

  it('answers null when nothing is published, the form is unknown or the value is malformed', async () => {
    expect(await findFormProjection(kvOf(null), registry, 'reservation')).toBeNull()
    expect(await findFormProjection(kvOf({ format: 9 }), registry, 'reservation')).toBeNull()
    expect(await findFormProjection(kvOf(projection([])), registry, 'other')).toBeNull()
  })
})
