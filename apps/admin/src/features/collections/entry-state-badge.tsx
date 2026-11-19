import type { EntrySummary } from '@studiobimo/backstage/internal'
import { useTranslation } from 'react-i18next'

import { PublishStateBadge } from '@/components/publish-state-badge'

import { ENTRY_STATE, entryState } from './entry-filters'

export function StateBadge({ entry }: { entry: EntrySummary }) {
  const { t } = useTranslation('collections')
  const state = entryState(entry)
  return (
    <PublishStateBadge
      published={state !== ENTRY_STATE.draft}
      changed={state === ENTRY_STATE.changed}
      labels={{
        published: t('list.published'),
        changed: t('list.changed'),
        draft: t('list.draft')
      }}
    />
  )
}
