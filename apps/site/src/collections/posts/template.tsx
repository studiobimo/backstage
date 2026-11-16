import type { z } from 'zod'

import { Picture, Translation } from '../../blocks/parts.tsx'
import type { postsSchema } from './schema.ts'

export function PostTemplate({ title, summary, cover }: z.output<typeof postsSchema>) {
  return (
    <article data-collection="posts">
      <hgroup>
        <h1>
          <Translation value={title} />
        </h1>
        <p>
          <Translation value={summary} />
        </p>
      </hgroup>
      <Picture value={cover} />
    </article>
  )
}
