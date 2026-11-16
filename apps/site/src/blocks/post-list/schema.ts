import { entries } from '@studiobimo/backstage'
import { z } from 'zod'

import { postsCollection } from '../../collections/posts/collection.ts'
import { optionalHeading } from '../schema-parts.ts'

const POST_LIST = { maxPosts: 6 } as const

export const postListSchema = z.object({
  heading: optionalHeading(),
  posts: entries(postsCollection, { max: POST_LIST.maxPosts })
})
