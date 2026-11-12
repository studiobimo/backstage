import type { z } from 'zod'

import { Picture, Translation, Cta, Body } from '../parts.tsx'
import type { overlayHeroSchema } from './schema.ts'

export function OverlayHero({
  title,
  body,
  cta,
  background,
  tint,
  align
}: z.output<typeof overlayHeroSchema>) {
  return (
    <section data-block="overlay-hero" data-tint={tint} data-align={align}>
      <Picture value={background} />
      <div>
        <h2>
          <Translation value={title} />
        </h2>
        <Body value={body} />
        <Cta value={cta} />
      </div>
    </section>
  )
}
