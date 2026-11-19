import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { type ReactNode, Suspense } from 'react'
import { vi } from 'vitest'

import { testQueryClient } from '@/test/query-client'

export const reservationForm = {
  name: 'reservation',
  title: { en: 'Reservation', es: 'Reserva' },
  statuses: ['new', 'confirmed', 'declined'],
  newStatus: 'new',
  newCount: 2,
  dateField: 'date',
  schema: {
    type: 'object',
    properties: {
      seats: { type: 'integer' },
      date: { type: 'string', format: 'date' },
      time: { type: 'string' },
      name: { type: 'string' },
      preorder: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            dish: { backstage: 'reference', collection: 'menu', max: 1 },
            quantity: { type: 'integer' }
          }
        }
      }
    },
    required: ['seats', 'date']
  }
}

export const reservation = {
  id: 's1',
  form: 'reservation',
  status: 'new',
  payload: {
    seats: 4,
    date: '2026-12-24',
    time: '20:30',
    name: 'Ana Pérez',
    preorder: [{ dish: { mode: 'chosen', ids: ['dish-1'] }, quantity: 2 }]
  },
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  updatedBy: null
}

export const paellaEntries = { menu: { 'dish-1': { en: 'Paella', es: 'Paella' } } }

export const mockInboxApi = (handlers: Record<string, (init?: RequestInit) => unknown>) => {
  const calls: { method: string; url: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ method: init?.method ?? 'GET', url })
      const handler = Object.entries(handlers).find(([path]) => url.includes(path))?.[1]
      return new Response(JSON.stringify(handler?.(init)))
    })
  )
  return calls
}

export const renderInbox = (children: ReactNode) =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <Suspense>{children}</Suspense>
    </QueryClientProvider>
  )
