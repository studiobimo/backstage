import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import { Button } from '@/components/ui/button'

import { MediaLibrary } from './media-library'
import { UploadForm } from './upload-form'

export function MediaPage() {
  const { t } = useTranslation('media')
  const [uploading, setUploading] = useState(false)
  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button onClick={() => setUploading(true)}>
            <Plus />
            {t('library.upload')}
          </Button>
        }
      />
      <MediaLibrary onUpload={() => setUploading(true)} />
      <ResponsiveDialog
        open={uploading}
        onOpenChange={setUploading}
        title={t('upload.heading')}
        description={t('upload.description')}
      >
        <UploadForm onUploaded={() => setUploading(false)} />
      </ResponsiveDialog>
    </>
  )
}
