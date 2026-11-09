import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header'

import { UploadForm } from './upload-form'

export function MediaPage() {
  const { t } = useTranslation('media')
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <UploadForm />
    </>
  )
}
