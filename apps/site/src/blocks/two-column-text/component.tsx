import type { z } from 'zod'

import { Heading, Body } from '../parts.tsx'
import type { twoColumnTextSchema } from './schema.ts'

export function TwoColumnText({ left, right }: z.output<typeof twoColumnTextSchema>) {
  return (
    <section data-block="two-column-text">
      {[left, right].map((column, index) => (
        <div key={index} data-column>
          <Heading value={column.heading} />
          <Body value={column.body} />
        </div>
      ))}
    </section>
  )
}
