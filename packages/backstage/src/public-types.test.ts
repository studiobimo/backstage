import { describe, expect, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'

import { link, type LinkInput, type ResolvedLink } from './index.ts'

describe('the public entry', () => {
  it('exports the types a link field is declared with', () => {
    type Schema = ReturnType<typeof link>
    expectTypeOf<z.output<Schema>>().toEqualTypeOf<ResolvedLink>()
    expectTypeOf<z.input<Schema>>().toEqualTypeOf<LinkInput>()
    expect(link().safeParse({ href: '/about', label: 'About' }).success).toBe(true)
  })
})
