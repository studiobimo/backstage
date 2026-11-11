import type { z } from 'zod'

import { Heading, Body } from '../parts.tsx'
import type { oneColumnTextSchema } from './schema.ts'

export function OneColumnText({ heading, body, width }: z.output<typeof oneColumnTextSchema>) {
  return (
    <section data-block="one-column-text" data-width={width}>
      <Heading value={heading} />
      <Body value={body} />
    </section>
  )
}
