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
      date: {
        type: 'string',
        format: 'date',
        labels: { en: { title: 'Date' }, es: { title: 'Fecha' } }
      },
      name: { type: 'string', labels: { en: { title: 'Name' }, es: { title: 'Nombre' } } },
      time: { type: 'string' },
      seats: {
        type: 'integer',
        labels: { en: { title: 'Seats' }, es: { title: 'Comensales' } }
      },
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
  tokenActive: true,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  updatedBy: null
}

const text = (value: string) => ({ kind: 'text', text: value }) as const

export const reservationFields = [
  { key: 'date', label: 'Date', value: text('Dec 24, 2026') },
  { key: 'name', label: 'Name', value: text('Ana Pérez') },
  { key: 'time', label: 'Time', value: text('20:30') },
  { key: 'seats', label: 'Seats', value: text('4') },
  {
    key: 'preorder',
    label: 'Preorder',
    value: {
      kind: 'table',
      columns: [
        { key: 'dish', label: 'Dish' },
        { key: 'price', label: 'Price' },
        { key: 'quantity', label: 'Quantity' }
      ],
      rows: [
        ['Paella', '$12.50', '2'],
        ['Flan', '$5.00', '1']
      ],
      total: { label: 'Total', text: '$17.50' }
    }
  }
]

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
