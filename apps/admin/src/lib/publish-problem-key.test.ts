import { describe, expect, it } from 'vitest'

import { publishProblemKey } from './publish-problem-key'

describe('publishProblemKey', () => {
  it('names the field when an invalid value has a path', () => {
    expect(publishProblemKey({ reason: 'invalid_content', path: 'cta.label' })).toBe(
      'publish.problems.invalid_content_field'
    )
  })

  it('uses the reason when there is no path', () => {
    expect(publishProblemKey({ reason: 'invalid_content' })).toBe(
      'publish.problems.invalid_content'
    )
    expect(publishProblemKey({ reason: 'migration_failed' })).toBe(
      'publish.problems.migration_failed'
    )
  })
})
