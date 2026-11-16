import type { ResolvedEntry } from '@studiobimo/backstage'
import { useImage, useLocalized } from '@studiobimo/backstage/render'
import type { z } from 'zod'

import type { postsCollection } from '../../collections/posts/collection.ts'
import { Heading } from '../parts.tsx'
import type { postListSchema } from './schema.ts'

function PostCard({
  content,
  href
}: Pick<ResolvedEntry<typeof postsCollection>, 'content' | 'href'>) {
  const title = useLocalized(content.title)
  const summary = useLocalized(content.summary)
  const cover = useImage(content.cover && { id: content.cover.id, alt: '' })
  return (
    <li data-card>
      {cover ? (
        <img src={cover.src} width={cover.width} height={cover.height} alt={cover.alt} />
      ) : null}
      <h3>{href ? <a href={href}>{title}</a> : title}</h3>
      {summary ? <p>{summary}</p> : null}
    </li>
  )
}

export function PostList({ heading, posts }: z.output<typeof postListSchema>) {
  if (posts.length === 0) return null
  return (
    <section data-block="post-list">
      <Heading value={heading} />
      <ul>
        {posts.map(({ id, content, href }) => (
          <PostCard key={id} content={content} href={href} />
        ))}
      </ul>
    </section>
  )
}
