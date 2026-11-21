import type { EntrySummary } from '@studiobimo/backstage/internal'

import { Badge } from '@/components/ui/badge'

export function EntryKey({ entry }: { entry: Pick<EntrySummary, 'key'> }) {
  if (!entry.key) return null
  return (
    <Badge variant="outline" className="shrink-0 font-mono">
      {entry.key}
    </Badge>
  )
}
