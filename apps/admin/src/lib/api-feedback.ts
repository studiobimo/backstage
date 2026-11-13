import { fieldIssuesOf, type FieldIssue } from '@studiobimo/backstage/internal'
import i18n, { type i18n as I18n } from 'i18next'
import { useTranslation } from 'react-i18next'
import { ZodError } from 'zod'

import { toastManager } from '@/components/ui/toast'

import { ApiError, SessionExpiredError } from './api'

const FALLBACK_KEY = 'apiErrors.fallback'

export function apiErrorMessage(instance: I18n, error: unknown): string {
  const key = error instanceof ApiError ? `apiErrors.${error.code}` : FALLBACK_KEY
  const t = instance.getFixedT(null, 'common')
  return t(instance.exists(key, { ns: 'common' }) ? key : FALLBACK_KEY)
}

export function useApiErrorMessage() {
  const { i18n: instance } = useTranslation('common')
  return (error: unknown) => apiErrorMessage(instance, error)
}

export function fieldIssuesFrom(error: unknown): FieldIssue[] {
  if (error instanceof ApiError) return error.issues
  if (error instanceof ZodError) return fieldIssuesOf(error)
  return []
}

export const localeOfIssue = (issue: FieldIssue, locales: readonly string[]) =>
  locales.find((locale) => issue.path.includes(locale))

let openToastId: string | undefined

const signInAgain = () => window.open('/', '_blank', 'noopener')

export function notifySessionExpired(error: unknown) {
  if (!(error instanceof SessionExpiredError) || openToastId) return
  const t = i18n.getFixedT(null, 'common')
  openToastId = toastManager.add({
    type: 'error',
    title: t('session.title'),
    description: t('session.description'),
    timeout: 0,
    onClose: () => {
      openToastId = undefined
    },
    actionProps: {
      children: t('session.signIn'),
      onClick: () => {
        signInAgain()
        if (openToastId) toastManager.close(openToastId)
      }
    }
  })
}
