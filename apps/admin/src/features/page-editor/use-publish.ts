import type { PageSummary } from '@studiobimo/backstage/internal'
import { useQueryClient } from '@tanstack/react-query'

import { publishPageMutation, unpublishPageMutation } from './queries'
import { usePublishActions } from './use-publish-actions'

export function usePublish(page: PageSummary, version: number) {
  const queryClient = useQueryClient()
  return usePublishActions(version, {
    publish: publishPageMutation(queryClient, page.id),
    unpublish: unpublishPageMutation(queryClient, page.id)
  })
}
