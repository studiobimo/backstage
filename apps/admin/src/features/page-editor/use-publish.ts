import type { PageSummary } from '@studiobimo/backstage'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { toastManager } from '@/components/ui/toast'

import { publishPageMutation, unpublishPageMutation } from './queries'

export function usePublish(page: PageSummary, version: number) {
  const { t } = useTranslation('pageEditor')
  const queryClient = useQueryClient()
  const publish = useMutation(publishPageMutation(queryClient, page.id))
  const unpublish = useMutation(unpublishPageMutation(queryClient, page.id))
  const reset = () => {
    publish.reset()
    unpublish.reset()
  }
  const notify = (message: 'published' | 'unpublished') =>
    toastManager.add({ type: 'success', title: t(`publish.toast.${message}`) })
  return {
    publishing: publish.isPending,
    unpublishing: unpublish.isPending,
    error: publish.error ?? unpublish.error,
    publish: () => {
      reset()
      publish.mutate(version, { onSuccess: () => notify('published') })
    },
    unpublish: () => {
      reset()
      unpublish.mutate(undefined, { onSuccess: () => notify('unpublished') })
    }
  }
}
