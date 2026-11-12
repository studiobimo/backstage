import type { z } from 'zod'

import { useHasContent } from '../content.ts'
import { Picture, Heading, Cta, Body } from '../parts.tsx'
import type { oneColumnSectionSchema } from './schema.ts'

export function OneColumnSection({
  heading,
  body,
  picture,
  cta,
  background,
  spacing
}: z.output<typeof oneColumnSectionSchema>) {
  const hasContent = useHasContent({ heading, body, picture, cta })
  if (!hasContent) return null
  return (
    <section data-block="one-column-section" data-background={background} data-spacing={spacing}>
      <Heading value={heading} />
      <Body value={body} />
      <Picture value={picture} />
      <Cta value={cta} />
    </section>
  )
}
