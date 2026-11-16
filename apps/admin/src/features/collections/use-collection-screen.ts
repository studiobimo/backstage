import { useQuery } from '@tanstack/react-query'
import { useMatches } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { configQuery } from '../config/queries'
import { collectionTitle, entryLabelText } from './collection-text'
import { collectionsQuery, entriesQuery } from './queries'

const COLLECTION_ROUTE_PREFIX = '/collections'
const NEW_ENTRY_ROUTE = '/collections_/$name/new'

interface CollectionParams {
  name?: string
  entryId?: string
}

export function useCollectionScreen() {
  const { t, i18n } = useTranslation('entryEditor')
  const match = useMatches({ select: (matches) => matches.at(-1) })
  const inCollection = match?.routeId.startsWith(COLLECTION_ROUTE_PREFIX) === true
  const { name = '', entryId } = (match?.params ?? {}) as CollectionParams
  const { data: collections } = useQuery({ ...collectionsQuery, enabled: inCollection })
  const { data: entries } = useQuery({ ...entriesQuery(name), enabled: inCollection })
  const { data: config } = useQuery({ ...configQuery, enabled: inCollection })
  if (!inCollection) return undefined
  const defaultLocale = config?.defaultLocale ?? ''
  const collection = collections?.find((candidate) => candidate.name === name)
  const saved = entries?.find((candidate) => candidate.id === entryId)
  const entryTitle = saved
    ? entryLabelText(saved.label, i18n.language, defaultLocale) || t('untitled')
    : match?.routeId === NEW_ENTRY_ROUTE
      ? t('new')
      : ''
  return {
    name,
    list: collection ? collectionTitle(collection, i18n.language, defaultLocale) : name,
    entry: entryId || match?.routeId === NEW_ENTRY_ROUTE ? entryTitle : undefined
  }
}
