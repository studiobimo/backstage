import { describe, expect, it } from 'vitest'

import { initialsOf } from './initials'

describe('initialsOf', () => {
  it('takes the first letters of the first two words', () => {
    expect(initialsOf('Ada Lovelace')).toBe('AL')
    expect(initialsOf('Ada Augusta King')).toBe('AA')
  })

  it('uses one letter for a one-word name', () => {
    expect(initialsOf('ada')).toBe('A')
  })

  it('falls back to the email when the name is empty', () => {
    expect(initialsOf('', 'ada.lovelace@example.com')).toBe('AL')
    expect(initialsOf(null, 'ada@example.com')).toBe('AE')
  })

  it('returns nothing when there is no name or email', () => {
    expect(initialsOf(null, undefined)).toBe('')
    expect(initialsOf('  ', '')).toBe('')
  })
})
