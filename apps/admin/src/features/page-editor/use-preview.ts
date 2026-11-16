import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { toastManager } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-feedback'

import { createPreviewMutation } from './queries'

const WINDOW = { target: '_blank', blank: '' } as const

const openBlankWindow = () => window.open(WINDOW.blank, WINDOW.target)

const showInWindow = (preview: Window | null, url: string) => {
  if (!preview) return window.open(url, WINDOW.target, 'noopener')
  preview.opener = null
  preview.location.href = url
  return preview
}

export function usePreview(pageId: string) {
  const { t, i18n } = useTranslation('pageEditor')
  const queryClient = useQueryClient()
  const create = useMutation(createPreviewMutation(queryClient, pageId))
  return {
    previewing: create.isPending,
    preview: () => {
      const preview = openBlankWindow()
      create.mutate(undefined, {
        onSuccess: (url) => showInWindow(preview, url),
        onError: (error) => {
          preview?.close()
          toastManager.add({
            type: 'error',
            title: t('preview.failed'),
            description:
              error instanceof ApiError && error.problems.length > 0
                ? t('publish.toast.problems', { count: error.problems.length })
                : apiErrorMessage(i18n, error)
          })
        }
      })
    }
  }
}
