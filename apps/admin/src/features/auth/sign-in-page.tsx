import { AUTH, requestLinkSchema } from '@studiobimo/backstage/internal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { CircleAlertIcon, MailCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppForm } from '@/components/form/app-form'
import { fieldErrorsOf } from '@/components/form/locale-errors'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useApiErrorMessage } from '@/lib/api-feedback'

import { requestLinkMutation, verifyLinkMutation } from './queries'

function Heading({ title, description }: { title: string; description: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-3xl">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </header>
  )
}

function FailureAlert({ message }: { message: string }) {
  const { t } = useTranslation('auth')
  return (
    <Alert variant="error" role="alert">
      <CircleAlertIcon />
      <AlertTitle>{t('failed')}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

function CheckEmail({ email, onReset }: { email: string; onReset: () => void }) {
  const { t } = useTranslation('auth')
  return (
    <>
      <Heading
        title={t('sent.title')}
        description={t('sent.description', { email, minutes: AUTH.token.ttlMinutes })}
      />
      <p role="status" className="flex items-center gap-2 text-muted-foreground text-sm">
        <MailCheckIcon aria-hidden className="size-4" />
        {t('sent.hint')}
      </p>
      <Button variant="outline" onClick={onReset} className="self-start">
        {t('sent.useAnother')}
      </Button>
    </>
  )
}

function EmailForm({ onSent }: { onSent: (email: string) => void }) {
  const { t } = useTranslation('auth')
  const messageOf = useApiErrorMessage()
  const request = useMutation(requestLinkMutation)
  const [failure, setFailure] = useState<string>()
  const form = useAppForm({
    defaultValues: { email: '' },
    validators: { onSubmit: ({ value }) => fieldErrorsOf(requestLinkSchema.safeParse(value)) },
    onSubmit: async ({ value }) => {
      setFailure(undefined)
      try {
        await request.mutateAsync(value)
        onSent(requestLinkSchema.parse(value).email)
      } catch (error) {
        setFailure(messageOf(error))
      }
    }
  })
  return (
    <>
      <Heading title={t('title')} description={t('description')} />
      {failure && <FailureAlert message={failure} />}
      <Form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.AppField name="email">
          {(field) => (
            <field.TextField label={t('email.label')} inputMode="email" autoComplete="email" />
          )}
        </form.AppField>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(submitting) => (
            <Button type="submit" loading={submitting} className="self-start">
              {t('submit')}
            </Button>
          )}
        </form.Subscribe>
      </Form>
    </>
  )
}

function ConfirmLink({ token }: { token: string }) {
  const { t } = useTranslation('auth')
  const messageOf = useApiErrorMessage()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const verify = useMutation({
    ...verifyLinkMutation,
    onSuccess: async () => {
      queryClient.clear()
      await navigate({ to: '/' })
    }
  })
  return (
    <>
      <Heading title={t('confirm.title')} description={t('confirm.description')} />
      {verify.isError && <FailureAlert message={messageOf(verify.error)} />}
      <Button
        loading={verify.isPending}
        onClick={() => verify.mutate({ token })}
        className="self-start"
      >
        {t('confirm.submit')}
      </Button>
      {verify.isError && (
        <Button
          variant="link"
          onClick={() => void navigate({ to: AUTH.signInPath, search: {} })}
          className="self-start"
        >
          {t('confirm.requestNew')}
        </Button>
      )}
    </>
  )
}

export function SignInPage({ token }: { token?: string }) {
  const [sentTo, setSentTo] = useState<string>()
  return (
    <main className="grid min-h-svh place-items-center px-gutter py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {token ? (
          <ConfirmLink token={token} />
        ) : sentTo ? (
          <CheckEmail email={sentTo} onReset={() => setSentTo(undefined)} />
        ) : (
          <EmailForm onSent={setSentTo} />
        )}
      </div>
    </main>
  )
}
