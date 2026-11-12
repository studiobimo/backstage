import { useQuery } from '@tanstack/react-query'
import { useMatch, useMatches } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { site } from '@/config/site'
import { pageLabel } from '@/features/pages/page-label'
import { pagesQuery } from '@/features/pages/queries'

const TITLE_SEPARATOR = ' · '

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    title?: string
  }
}

export function useScreenTitle() {
  const { t, i18n } = useTranslation()
  const titleKey = useMatches({ select: (matches) => matches.at(-1)?.staticData.title })
  const editing = useMatch({ from: '/pages_/$pageId', shouldThrow: false })
  const { data: pages } = useQuery({ ...pagesQuery, enabled: Boolean(editing) })
  const editedPage = pages?.find((candidate) => candidate.id === editing?.params.pageId)
  if (editedPage) return pageLabel(editedPage, i18n.language)
  return titleKey ? t(titleKey) : ''
}

export function useDocumentTitle() {
  const title = useScreenTitle()
  useEffect(() => {
    document.title = title ? `${title}${TITLE_SEPARATOR}${site.name}` : site.name
  }, [title])
}
