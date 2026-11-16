import { defineCollection } from '@studiobimo/backstage'

import { POSTS_ROUTE } from './route.ts'
import { postsSchema } from './schema.ts'

export const postsCollection = defineCollection({
  name: 'posts',
  label: 'title',
  route: { path: POSTS_ROUTE.path },
  title: { en: 'Posts', es: 'Entradas' },
  schema: postsSchema
})
