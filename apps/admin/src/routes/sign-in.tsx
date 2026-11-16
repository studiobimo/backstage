import { AUTH } from '@studiobimo/backstage/internal'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { SignInPage } from '@/features/auth/sign-in-page'

export const Route = createFileRoute('/sign-in')({
  validateSearch: z.object({ [AUTH.tokenParam]: z.string().optional() }),
  staticData: { title: 'signIn.title' },
  component: SignInRoute
})

function SignInRoute() {
  const { token } = Route.useSearch()
  return <SignInPage token={token} />
}
