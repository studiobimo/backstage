import { CSPProvider } from '@base-ui/react/csp-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './i18n/config'
import { createAppRouter } from './router'
import { startTheme } from './lib/theme'
import './index.css'

startTheme()

const queryClient = new QueryClient()
const router = createAppRouter(queryClient)

// public/_headers allows no inline <style>, so Base UI's own come from index.css instead.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CSPProvider disableStyleElements>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </CSPProvider>
  </StrictMode>
)
