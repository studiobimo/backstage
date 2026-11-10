import type { PageSummary } from '@studiobimo/backstage'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { toastManager } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'

import { publishPageMutation, unpublishPageMutation } from './queries'

type PublishAction = 'publish' | 'unpublish'

const failureReason = (t: TFunction<'pageEditor'>, error: unknown) => {
  if (error instanceof ApiError && error.problems.length > 0) {
    return t('publish.toast.problems', { count: error.problems.length })
  }
  return t(`publish.errors.${error instanceof ApiError ? error.code : 'internal'}`, {
    defaultValue: t('publish.errors.internal')
  })
}

const trackWithToast = async (
  t: TFunction<'pageEditor'>,
  action: PublishAction,
  request: Promise<unknown>
) => {
  try {
    await toastManager.promise(request, {
      loading: { title: t(`publish.toast.${action}.pending`) },
      success: { title: t(`publish.toast.${action}.done`) },
      error: (error: unknown) => ({
        title: t(`publish.toast.${action}.failed`),
        description: failureReason(t, error)
      })
    })
  } catch {
    return
  }
}

export function usePublish(page: PageSummary, version: number) {
  const { t } = useTranslation('pageEditor')
  const queryClient = useQueryClient()
  const publish = useMutation(publishPageMutation(queryClient, page.id))
  const unpublish = useMutation(unpublishPageMutation(queryClient, page.id))
  const reset = () => {
    publish.reset()
    unpublish.reset()
  }
  return {
    publishing: publish.isPending,
    unpublishing: unpublish.isPending,
    error: publish.error ?? unpublish.error,
    publish: () => {
      reset()
      void trackWithToast(t, 'publish', publish.mutateAsync(version))
    },
    unpublish: () => {
      reset()
      void trackWithToast(t, 'unpublish', unpublish.mutateAsync())
    }
  }
}
