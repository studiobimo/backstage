import type { ReactNode } from 'react'

import { Frame } from '@/components/ui/frame'
import { Table, TableBody, TableHeader, TableRow } from '@/components/ui/table'

interface CardTableProps {
  head: ReactNode
  children: ReactNode
}

export function CardTable({ head, children }: CardTableProps) {
  return (
    <Frame>
      <Table variant="card">
        <TableHeader>
          <TableRow>{head}</TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </Frame>
  )
}
