import { type UseMutationOptions, useMutation } from '@tanstack/react-query'
import type { i18n as I18n, TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { toastManager } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-feedback'

type PublishAction = 'publish' | 'unpublish'

const failureReason = (
  t: TFunction<'pageEditor'>,
  i18n: I18n,
  error: unknown,
  context?: string
) => {
  if (error instanceof ApiError && error.problems.length > 0) {
    return t('publish.toast.problems', { count: error.problems.length, context })
  }
  return apiErrorMessage(i18n, error)
}

const trackWithToast = async (
  i18n: I18n,
  t: TFunction<'pageEditor'>,
  action: PublishAction,
  request: Promise<unknown>,
  context?: string
) => {
  try {
    await toastManager.promise(request, {
      loading: { title: t(`publish.toast.${action}.pending`) },
      success: { title: t(`publish.toast.${action}.done`) },
      error: (error: unknown) => ({
        title: t(`publish.toast.${action}.failed`),
        description: failureReason(t, i18n, error, context)
      })
    })
  } catch {
    return
  }
}

interface PublishRequests<TData> {
  publish: UseMutationOptions<TData, Error, number>
  unpublish: UseMutationOptions<TData, Error, void>
  context?: 'entry'
}

export function usePublishActions<TData>(version: number, requests: PublishRequests<TData>) {
  const { t, i18n } = useTranslation('pageEditor')
  const publish = useMutation(requests.publish)
  const unpublish = useMutation(requests.unpublish)
  const { context } = requests
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
      void trackWithToast(i18n, t, 'publish', publish.mutateAsync(version), context)
    },
    unpublish: () => {
      reset()
      void trackWithToast(i18n, t, 'unpublish', unpublish.mutateAsync(), context)
    }
  }
}
