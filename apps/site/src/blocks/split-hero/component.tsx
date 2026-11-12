import type { z } from 'zod'

import { Picture, Translation, Cta, Body } from '../parts.tsx'
import type { splitHeroSchema } from './schema.ts'

export function SplitHero({
  title,
  body,
  cta,
  picture,
  theme,
  imageSide
}: z.output<typeof splitHeroSchema>) {
  return (
    <section data-block="split-hero" data-theme={theme} data-image-side={imageSide}>
      <div>
        <h2>
          <Translation value={title} />
        </h2>
        <Body value={body} />
        <Cta value={cta} />
      </div>
      <Picture value={picture} />
    </section>
  )
}
