import { createFileRoute, notFound } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const BlockPreviewPage = import.meta.env.DEV
  ? lazy(async () => ({
      default: (await import('@/features/block-preview/block-preview-page')).BlockPreviewPage
    }))
  : () => null

export const Route = createFileRoute('/blocks')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  component: () => (
    <Suspense fallback={null}>
      <BlockPreviewPage />
    </Suspense>
  )
})
