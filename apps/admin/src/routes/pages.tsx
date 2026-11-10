import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'

import { PagesPage } from '@/features/pages/pages-page'
import { pagesQuery } from '@/features/pages/queries'

const pagesSearchSchema = z.object({ create: z.boolean().optional() })

function PagesRoute() {
  const { create } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const clearCreate = useCallback(() => void navigate({ search: {}, replace: true }), [navigate])
  return <PagesPage createRequested={create === true} onCreateHandled={clearCreate} />
}

export const Route = createFileRoute('/pages')({
  validateSearch: pagesSearchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(pagesQuery),
  staticData: { width: 'wide' },
  component: PagesRoute
})
