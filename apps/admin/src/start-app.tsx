import { CSPProvider } from '@base-ui/react/csp-provider'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './i18n/config'
import { createAppRouter } from './router'
import { notifySessionExpired } from './lib/api-feedback'
import { startTheme } from './lib/theme'
import './index.css'

startTheme()

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: notifySessionExpired }),
  mutationCache: new MutationCache({ onError: notifySessionExpired })
})
const router = createAppRouter(queryClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CSPProvider disableStyleElements>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </CSPProvider>
  </StrictMode>
)
