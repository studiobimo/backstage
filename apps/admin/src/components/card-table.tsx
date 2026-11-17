import type { ReactNode } from 'react'

import { FrameSection } from '@/components/frame-section'
import { Table, TableBody, TableHeader, TableRow } from '@/components/ui/table'

interface CardTableProps {
  head: ReactNode
  title?: string
  description?: string
  badges?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export function CardTable({ head, children, ...header }: CardTableProps) {
  return (
    <FrameSection {...header} panel={false}>
      <Table variant="card">
        <TableHeader>
          <TableRow>{head}</TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </FrameSection>
  )
}
