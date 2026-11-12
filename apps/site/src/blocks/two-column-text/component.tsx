import type { z } from 'zod'

import { useHasContent } from '../content.ts'
import { Heading, Body } from '../parts.tsx'
import type { twoColumnTextSchema } from './schema.ts'

type TextColumnValue = z.output<typeof twoColumnTextSchema>['left']

function TextColumn({ heading, body }: TextColumnValue) {
  return (
    <div data-column>
      <Heading value={heading} />
      <Body value={body} />
    </div>
  )
}

export function TwoColumnText({ left, right }: z.output<typeof twoColumnTextSchema>) {
  const hasLeft = useHasContent(left)
  const hasRight = useHasContent(right)
  if (!hasLeft && !hasRight) return null
  return (
    <section data-block="two-column-text">
      {hasLeft ? <TextColumn {...left} /> : null}
      {hasRight ? <TextColumn {...right} /> : null}
    </section>
  )
}
