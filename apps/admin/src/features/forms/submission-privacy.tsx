import { INBOX, type InboxSubmission } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DeleteDialog } from '@/components/delete-dialog'
import { FrameSection } from '@/components/frame-section'
import { Button } from '@/components/ui/button'

import { deleteSubmissionMutation, privacyMutation } from './queries'

const PRIVACY_ACTION = {
  revokeToken: 'revokeToken',
  anonymise: 'anonymise',
  delete: 'delete'
} as const satisfies Record<keyof typeof INBOX.paths | 'delete', string>

type PrivacyAction = (typeof PRIVACY_ACTION)[keyof typeof PRIVACY_ACTION]

const ACTION_ORDER: readonly PrivacyAction[] = Object.values(PRIVACY_ACTION)

interface SubmissionPrivacyProps {
  form: string
  submission: InboxSubmission
}

export function SubmissionPrivacy({ form, submission }: SubmissionPrivacyProps) {
  const { t } = useTranslation('forms')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [pending, setPending] = useState<PrivacyAction | null>(null)
  const removal = deleteSubmissionMutation(queryClient, form)
  const mutations = {
    [PRIVACY_ACTION.revokeToken]: useMutation(
      privacyMutation(queryClient, form, PRIVACY_ACTION.revokeToken)
    ),
    [PRIVACY_ACTION.anonymise]: useMutation(
      privacyMutation(queryClient, form, PRIVACY_ACTION.anonymise)
    ),
    [PRIVACY_ACTION.delete]: useMutation({
      ...removal,
      onSuccess: async (...args) => {
        await removal.onSuccess?.(...args)
        await navigate({ to: '/forms/$name', params: { name: form } })
      }
    })
  }
  return (
    <FrameSection title={t('privacy.title')} description={t('privacy.description')}>
      <div className="flex flex-wrap gap-2">
        {ACTION_ORDER.map((action) => (
          <Button
            key={action}
            variant="outline"
            disabled={action === PRIVACY_ACTION.revokeToken && !submission.tokenActive}
            onClick={() => setPending(action)}
          >
            {t(`privacy.${action}.button`)}
          </Button>
        ))}
      </div>
      {ACTION_ORDER.map((action) => (
        <DeleteDialog
          key={action}
          id={submission.id}
          remove={mutations[action]}
          open={pending === action}
          onOpenChange={(open) => setPending(open ? action : null)}
          title={t(`privacy.${action}.title`)}
          description={t(`privacy.${action}.description`)}
          cancelLabel={t('privacy.cancel')}
          confirmLabel={t(`privacy.${action}.confirm`)}
        />
      ))}
    </FrameSection>
  )
}
