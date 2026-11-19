import { describe, expect, it } from 'vitest'

import type { JsonSchema } from '@/features/block-form/spec.ts'

import { localizeSchema } from './translate-schema'

const schema: JsonSchema = {
  type: 'object',
  properties: {
    seats: {
      type: 'integer',
      labels: { en: { title: 'Seats' }, es: { title: 'Comensales', description: 'Personas' } }
    },
    phone: { type: 'string', title: 'Phone', labels: { en: { title: 'Phone number' } } },
    notes: { type: 'string' },
    visit: {
      type: 'object',
      labels: { en: { title: 'Visit' }, es: { title: 'Visita' } },
      properties: { date: { type: 'string', labels: { en: { title: 'Date' } } } }
    }
  }
}

const titles = (language: string, defaultLocale = 'en') => {
  const { properties = {} } = localizeSchema(schema, language, defaultLocale)
  return {
    seats: properties.seats?.title,
    phone: properties.phone?.title,
    notes: properties.notes?.title,
    visit: properties.visit?.title,
    date: properties.visit?.properties?.date?.title
  }
}

describe('localizeSchema', () => {
  it('uses the label of the current language, groups and nested fields included', () => {
    expect(titles('es')).toMatchObject({ seats: 'Comensales', visit: 'Visita' })
    expect(localizeSchema(schema, 'es', 'en').properties?.seats?.description).toBe('Personas')
  })

  it('falls back to the default locale, then to the plain title', () => {
    expect(titles('fr')).toEqual({
      seats: 'Seats',
      phone: 'Phone number',
      notes: undefined,
      visit: 'Visit',
      date: 'Date'
    })
    expect(titles('es').phone).toBe('Phone number')
  })

  it('leaves a field without labels alone so the key is humanized later', () => {
    expect(titles('es').notes).toBeUndefined()
  })
})
