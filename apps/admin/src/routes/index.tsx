import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header'
import { site } from '@/config/site'

export const Route = createFileRoute('/')({
  component: HomeRoute
})

function HomeRoute() {
  const { t } = useTranslation()
  return (
    <PageHeader title={t('home.title', { name: site.name })} description={t('home.description')} />
  )
}
