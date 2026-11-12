import { describe, expect, it } from 'vitest'

import { kvWritesPerPage, kvWritesToRepublish, republishBatchSize } from './republish.ts'

const TWO = ['en', 'es']
const FOUR = ['en', 'es', 'fr', 'de']

describe('republish sizing by locale', () => {
  it('keeps the batch at two pages for English and Spanish and shrinks it as locales grow', () => {
    expect(republishBatchSize(TWO)).toBe(2)
    expect(republishBatchSize(['fr'])).toBe(5)
    expect(republishBatchSize(FOUR)).toBe(1)
  })

  it('never asks for a batch of less than one page', () => {
    expect(republishBatchSize(Array.from({ length: 20 }, (_, index) => `l${index}`))).toBe(1)
  })

  it('counts a snapshot and a route write for each locale of a page', () => {
    expect(kvWritesPerPage(TWO)).toBe(4)
    expect(kvWritesPerPage(['fr'])).toBe(2)
    expect(kvWritesToRepublish(3, FOUR)).toBe(3 * 8 + 1)
    expect(kvWritesToRepublish(0, FOUR)).toBe(0)
  })
})
