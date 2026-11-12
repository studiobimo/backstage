import { createFileRoute } from '@tanstack/react-router'

import { TypeSpecimen } from '@/components/type-specimen'

export const Route = createFileRoute('/type')({
  staticData: { title: 'nav.type' },
  component: TypeSpecimen
})
