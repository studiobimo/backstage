import { AUTH } from '@studiobimo/backstage/internal'
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, redirect, useLocation } from '@tanstack/react-router'

import { AppShell } from '@/components/app-shell'
import { isUnauthorized } from '@/features/auth/queries'
import { configQuery } from '@/features/config/queries'

export interface RouterContext {
  queryClient: QueryClient
}

const loadConfig = async (queryClient: QueryClient) => {
  try {
    await queryClient.ensureQueryData(configQuery)
  } catch (error) {
    if (isUnauthorized(error)) throw redirect({ to: AUTH.signInPath })
    throw error
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: ({ context, location }) =>
    location.pathname === AUTH.signInPath ? undefined : loadConfig(context.queryClient),
  component: RootLayout
})

function RootLayout() {
  const { pathname } = useLocation()
  if (pathname === AUTH.signInPath) return <Outlet />
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
