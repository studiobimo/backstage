import {
  collectionDescriptionSchema,
  entriesResponseSchema,
  entryResponseSchema,
  type Entry
} from '@studiobimo/backstage/internal'
import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { apiRequest } from '@/lib/api'

import type { JsonSchema } from '../block-form/spec'

export interface EntrySlugEdits {
  slugs?: Record<string, string>
}

const collectionSchema = collectionDescriptionSchema.extend({ schema: z.custom<JsonSchema>() })

export type CollectionOption = z.infer<typeof collectionSchema>

const collectionsResponse = z.object({ collections: z.array(collectionSchema) })

export const collectionsQuery = queryOptions({
  queryKey: ['collections'],
  staleTime: Infinity,
  queryFn: async () =>
    collectionsResponse.parse(await (await apiRequest('/collections')).json()).collections
})

const entriesKey = (collection: string) => ['entries', collection] as const

export const entryKey = (collection: string, id: string) => ['entry', collection, id] as const

const entriesPath = (collection: string, id = '') =>
  `/collections/${collection}/entries${id && `/${id}`}`

export const entriesQuery = (collection: string) =>
  queryOptions({
    queryKey: entriesKey(collection),
    queryFn: async () =>
      entriesResponseSchema.parse(await (await apiRequest(entriesPath(collection))).json()).entries
  })

export const entryQuery = (collection: string, id: string) =>
  queryOptions({
    queryKey: entryKey(collection, id),
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () =>
      entryResponseSchema.parse(await (await apiRequest(entriesPath(collection, id))).json()).entry
  })

const refreshEntries = (queryClient: QueryClient, collection: string) =>
  queryClient.invalidateQueries({ queryKey: entriesKey(collection) })

const keepEntry = (queryClient: QueryClient, entry: Entry) => {
  queryClient.setQueryData(entryKey(entry.collection, entry.id), entry)
  return refreshEntries(queryClient, entry.collection)
}

const readEntry = async (response: Response) =>
  entryResponseSchema.parse(await response.json()).entry

export const createEntryMutation = (queryClient: QueryClient, collection: string) =>
  mutationOptions({
    mutationFn: async (create: EntrySlugEdits & { content: Entry['content'] }) =>
      readEntry(
        await apiRequest(entriesPath(collection), {
          method: 'POST',
          body: JSON.stringify(create)
        })
      ),
    onSuccess: (entry) => keepEntry(queryClient, entry)
  })

export const saveEntryMutation = (queryClient: QueryClient, collection: string, id: string) =>
  mutationOptions({
    mutationFn: async (
      save: EntrySlugEdits & { content: Entry['content']; expectedVersion: number }
    ) =>
      readEntry(
        await apiRequest(entriesPath(collection, id), {
          method: 'PUT',
          body: JSON.stringify(save)
        })
      ),
    onSuccess: (entry) => keepEntry(queryClient, entry)
  })

export const deleteEntryMutation = (queryClient: QueryClient, collection: string) =>
  mutationOptions({
    mutationFn: async (id: string) => {
      await apiRequest(entriesPath(collection, id), { method: 'DELETE' })
    },
    onSuccess: () => refreshEntries(queryClient, collection)
  })

const publishPath = (collection: string, id: string) => `${entriesPath(collection, id)}/publish`

export const publishEntryMutation = (queryClient: QueryClient, collection: string, id: string) =>
  mutationOptions({
    mutationFn: async (expectedVersion: number) =>
      readEntry(
        await apiRequest(publishPath(collection, id), {
          method: 'POST',
          body: JSON.stringify({ expectedVersion })
        })
      ),
    onSuccess: (entry) => keepEntry(queryClient, entry)
  })

export const unpublishEntryMutation = (queryClient: QueryClient, collection: string, id: string) =>
  mutationOptions({
    mutationFn: async () =>
      readEntry(await apiRequest(publishPath(collection, id), { method: 'DELETE' })),
    onSuccess: (entry) => keepEntry(queryClient, entry)
  })
