import { Badge } from '@/components/ui/badge'

interface PublishStateBadgeProps {
  published: boolean
  changed: boolean
  labels: { published: string; changed: string; draft: string }
}

export function PublishStateBadge({ published, changed, labels }: PublishStateBadgeProps) {
  return (
    <Badge variant="outline">
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${changed ? 'bg-warning' : published ? 'bg-success' : 'bg-muted-foreground/64'}`}
      />
      {changed ? labels.changed : published ? labels.published : labels.draft}
    </Badge>
  )
}
