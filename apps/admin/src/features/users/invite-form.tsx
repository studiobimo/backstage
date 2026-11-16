import { inviteUserSchema, ROLE, type Role } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppForm } from '@/components/form/app-form'
import { fieldErrorsOf } from '@/components/form/locale-errors'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { toastManager } from '@/components/ui/toast'
import { useApiErrorMessage } from '@/lib/api-feedback'

import { inviteUserMutation } from './queries'
import { useRoleOptions } from './role-options'

const emptyInvite: { email: string; role: Role } = { email: '', role: ROLE.editor }

export function InviteForm() {
  const { t } = useTranslation('users')
  const messageOf = useApiErrorMessage()
  const roleOptions = useRoleOptions()
  const invite = useMutation(inviteUserMutation(useQueryClient()))
  const [failure, setFailure] = useState<string>()
  const form = useAppForm({
    defaultValues: emptyInvite,
    validators: { onSubmit: ({ value }) => fieldErrorsOf(inviteUserSchema.safeParse(value)) },
    onSubmit: async ({ value }) => {
      setFailure(undefined)
      try {
        await invite.mutateAsync(value)
        toastManager.add({
          type: 'success',
          title: t('invite.done', { email: inviteUserSchema.parse(value).email })
        })
        form.reset()
      } catch (error) {
        setFailure(messageOf(error))
      }
    }
  })
  return (
    <section aria-labelledby="invite-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="invite-heading" className="text-xl">
          {t('invite.title')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('invite.description')}</p>
      </div>
      {failure && (
        <Alert variant="error" role="alert">
          <CircleAlertIcon />
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
      <Form
        className="flex flex-col items-start gap-4 sm:flex-row"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <div className="w-full sm:max-w-sm">
          <form.AppField name="email">
            {(field) => (
              <field.TextField label={t('invite.email')} inputMode="email" autoComplete="off" />
            )}
          </form.AppField>
        </div>
        <div className="w-full sm:max-w-44">
          <form.AppField name="role">
            {(field) => <field.SelectField label={t('invite.role')} options={roleOptions} />}
          </form.AppField>
        </div>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(submitting) => (
            <Button type="submit" loading={submitting} className="sm:mt-6.5">
              {t('invite.submit')}
            </Button>
          )}
        </form.Subscribe>
      </Form>
    </section>
  )
}
