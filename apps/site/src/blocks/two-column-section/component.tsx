import type { z } from 'zod'

import { useHasContent } from '../content.ts'
import { Picture, Heading, Cta, Body } from '../parts.tsx'
import type { twoColumnSectionSchema } from './schema.ts'

type SectionColumnValue = z.output<typeof twoColumnSectionSchema>['left']

function SectionColumn({ heading, body, picture, cta }: SectionColumnValue) {
  return (
    <div data-column>
      <Heading value={heading} />
      <Body value={body} />
      <Picture value={picture} />
      <Cta value={cta} />
    </div>
  )
}

export function TwoColumnSection({
  left,
  right,
  split,
  background,
  spacing
}: z.output<typeof twoColumnSectionSchema>) {
  const hasLeft = useHasContent(left)
  const hasRight = useHasContent(right)
  if (!hasLeft && !hasRight) return null
  return (
    <section
      data-block="two-column-section"
      data-split={split}
      data-background={background}
      data-spacing={spacing}
    >
      {hasLeft ? <SectionColumn {...left} /> : null}
      {hasRight ? <SectionColumn {...right} /> : null}
    </section>
  )
}
