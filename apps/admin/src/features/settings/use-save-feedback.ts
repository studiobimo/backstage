import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { toastManager } from '@/components/ui/toast'

export function useSaveFeedback<V>(save: (value: V) => Promise<unknown>) {
  const { t } = useTranslation('settings')
  const [failed, setFailed] = useState(false)
  async function submit(value: V) {
    setFailed(false)
    try {
      await save(value)
      toastManager.add({
        type: 'success',
        title: t('saved.title'),
        description: t('saved.description')
      })
    } catch {
      setFailed(true)
    }
  }
  return { submit, failed }
}
