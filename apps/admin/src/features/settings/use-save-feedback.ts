import type { FieldIssue } from '@studiobimo/backstage'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { toastManager } from '@/components/ui/toast'
import { fieldIssuesFrom } from '@/lib/api-feedback'

export function useSaveFeedback<V>(save: (value: V) => Promise<unknown>) {
  const { t } = useTranslation('settings')
  const [failed, setFailed] = useState(false)
  const [issues, setIssues] = useState<FieldIssue[]>([])
  async function submit(value: V) {
    setFailed(false)
    setIssues([])
    try {
      await save(value)
      toastManager.add({
        type: 'success',
        title: t('saved.title'),
        description: t('saved.description')
      })
    } catch (error) {
      const refused = fieldIssuesFrom(error)
      setIssues(refused)
      setFailed(refused.length === 0)
    }
  }
  return { submit, failed, issues }
}
