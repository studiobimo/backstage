import type { PublishProblem, SitePublication } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { CircleAlertIcon, RocketIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toastManager } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { useApiErrorMessage } from '@/lib/api-feedback'
import { formatDateTime } from '@/lib/format'
import { publishProblemKey } from '@/lib/publish-problem-key'

import { publishSiteMutation, sitePublicationQuery } from './queries'
import { SettingsSection } from './settings-section'

const PUBLICATION_STATE = {
  never: { key: 'never', badge: 'warning' },
  changes: { key: 'changes', badge: 'warning' },
  live: { key: 'live', badge: 'success' }
} as const

const stateOf = ({ publishedAt, hasUnpublishedChanges }: SitePublication) => {
  if (publishedAt === null) return PUBLICATION_STATE.never
  return hasUnpublishedChanges ? PUBLICATION_STATE.changes : PUBLICATION_STATE.live
}

function useHint(publication: SitePublication, stateKey: string) {
  const { t, i18n } = useTranslation('settings')
  return t(`publish.hint.${stateKey}`, {
    when: publication.publishedAt && formatDateTime(i18n.language, publication.publishedAt),
    name: publication.publishedBy ?? t('publish.someone')
  })
}

function useProblemText() {
  const { t } = useTranslation('settings')
  return ({ reason, slot, path }: PublishProblem) =>
    t(publishProblemKey({ reason, path }), {
      place: slot ? t(`slots.${slot}.title`, { defaultValue: slot }) : t('sections.general.title'),
      path: slot || !path ? (path ?? '') : t(`fields.${path}.title`, { defaultValue: path }),
      defaultValue: t('publish.problems.invalid_content', { place: slot ?? '' })
    })
}

function ProblemsAlert({ problems }: { problems: PublishProblem[] }) {
  const { t } = useTranslation('settings')
  const textOf = useProblemText()
  return (
    <Alert variant="error" role="alert">
      <CircleAlertIcon />
      <AlertTitle>{t('publish.problems.title')}</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {problems.map((problem) => (
            <li key={`${problem.reason}:${problem.slot}:${problem.path}`}>{textOf(problem)}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

function PublishFailure({ error }: { error: unknown }) {
  const messageOf = useApiErrorMessage()
  if (!error) return null
  if (error instanceof ApiError && error.problems.length > 0) {
    return <ProblemsAlert problems={error.problems} />
  }
  return (
    <p role="alert" className="text-destructive-foreground text-sm">
      {messageOf(error)}
    </p>
  )
}

function usePublishSite() {
  const { t } = useTranslation('settings')
  const publish = useMutation(publishSiteMutation(useQueryClient()))
  return {
    error: publish.error,
    pending: publish.isPending,
    run: () =>
      publish.mutate(undefined, {
        onSuccess: () => toastManager.add({ type: 'success', title: t('publish.done') })
      })
  }
}

export function PublishSiteSection() {
  const { t } = useTranslation('settings')
  const { data: publication } = useSuspenseQuery(sitePublicationQuery)
  const publish = usePublishSite()
  const state = stateOf(publication)
  const hint = useHint(publication, state.key)
  return (
    <SettingsSection title={t('publish.title')} description={t('publish.description')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge variant={state.badge} size="lg">
          {t(`publish.status.${state.key}`)}
        </Badge>
        <p id="publish-hint" className="text-muted-foreground text-sm">
          {hint}
        </p>
      </div>
      <PublishFailure error={publish.error} />
      <Button
        className="self-start"
        aria-describedby="publish-hint"
        loading={publish.pending}
        disabled={publish.pending || state === PUBLICATION_STATE.live}
        onClick={publish.run}
      >
        <RocketIcon aria-hidden />
        {t('publish.action')}
      </Button>
    </SettingsSection>
  )
}
