import {
  formsResponseSchema,
  INBOX,
  submissionResponseSchema,
  submissionsResponseSchema,
  type FormDescription
} from '@studiobimo/backstage/internal'
import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { apiRequest } from '@/lib/api'

import type { JsonSchema } from '../block-form/spec'

const FORMS_STALE_MS = 30_000

export interface FormOption extends Omit<FormDescription, 'schema'> {
  schema: JsonSchema
}

export interface SubmissionFilter {
  status?: string
  from?: string
  to?: string
}

const formOptionSchema = formsResponseSchema.shape.forms.element.extend({
  schema: z.custom<JsonSchema>()
})

const formsKey = ['forms'] as const
const submissionsKey = (form: string) => ['submissions', form] as const
const submissionKey = (form: string, id: string) => ['submission', form, id] as const

const filterQuery = (filter: SubmissionFilter) => {
  const params = new URLSearchParams()
  for (const key of Object.values(INBOX.query)) {
    const value = filter[key]
    if (value) params.set(key, value)
  }
  const text = params.toString()
  return text && `?${text}`
}

export const formsQuery = queryOptions({
  queryKey: formsKey,
  staleTime: FORMS_STALE_MS,
  queryFn: async () =>
    z.object({ forms: z.array(formOptionSchema) }).parse(await (await apiRequest('/forms')).json())
      .forms
})

export const submissionsQuery = (form: string, filter: SubmissionFilter) =>
  queryOptions({
    queryKey: [...submissionsKey(form), filter],
    queryFn: async () =>
      submissionsResponseSchema.parse(
        await (await apiRequest(`/forms/${form}/submissions${filterQuery(filter)}`)).json()
      ).submissions
  })

export const submissionQuery = (form: string, id: string) =>
  queryOptions({
    queryKey: submissionKey(form, id),
    queryFn: async () =>
      submissionResponseSchema.parse(
        await (await apiRequest(`/forms/${form}/submissions/${id}`)).json()
      )
  })

export const changeStatusMutation = (queryClient: QueryClient, form: string, id: string) =>
  mutationOptions({
    mutationFn: async (status: string) =>
      submissionResponseSchema.pick({ submission: true }).parse(
        await (
          await apiRequest(`/forms/${form}/submissions/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
          })
        ).json()
      ).submission,
    onSuccess: async (submission) => {
      queryClient.setQueryData(
        submissionKey(form, id),
        (current?: z.infer<typeof submissionResponseSchema>) =>
          current && { ...current, submission }
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: submissionsKey(form) }),
        queryClient.invalidateQueries({ queryKey: formsKey })
      ])
    }
  })

type PrivacyAction = keyof typeof INBOX.paths

const refreshSubmissions = (queryClient: QueryClient, form: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: submissionsKey(form) }),
    queryClient.invalidateQueries({ queryKey: formsKey })
  ])

export const privacyMutation = (queryClient: QueryClient, form: string, action: PrivacyAction) =>
  mutationOptions({
    mutationFn: async (id: string) =>
      submissionResponseSchema.pick({ submission: true }).parse(
        await (
          await apiRequest(`/forms/${form}/submissions/${id}/${INBOX.paths[action]}`, {
            method: 'POST'
          })
        ).json()
      ).submission,
    onSuccess: async (submission) => {
      queryClient.setQueryData(
        submissionKey(form, submission.id),
        (current?: z.infer<typeof submissionResponseSchema>) =>
          current && { ...current, submission }
      )
      await refreshSubmissions(queryClient, form)
    }
  })

export const deleteSubmissionMutation = (queryClient: QueryClient, form: string) =>
  mutationOptions({
    mutationFn: async (id: string) => {
      await apiRequest(`/forms/${form}/submissions/${id}`, { method: 'DELETE' })
    },
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: submissionKey(form, id) })
      await refreshSubmissions(queryClient, form)
    }
  })
