import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header'

import { MediaLibrary } from './media-library'
import { mediaListQuery } from './queries'
import { UploaderLayer, UploadButton } from './uploader-parts'
import { useMediaUploader } from './use-media-uploader'

export function MediaPage() {
  const { t } = useTranslation('media')
  const uploader = useMediaUploader()
  const { data } = useQuery(mediaListQuery)
  const showUpload = (data?.length ?? 0) > 0 || uploader.pending.length > 0
  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          showUpload && (
            <UploadButton onFiles={uploader.addFiles}>{t('library.upload')}</UploadButton>
          )
        }
      />
      <MediaLibrary uploader={uploader} />
      <UploaderLayer uploader={uploader} />
    </>
  )
}
