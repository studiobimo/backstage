import { ROLE, type CurrentUser, type User } from '@studiobimo/backstage/internal'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderShell, resetShell } from '@/test/shell'

const OWNER: User = {
  id: 'u-owner',
  email: 'owner@studio.test',
  name: 'Olivia',
  role: ROLE.owner,
  createdAt: 1
}
const EDITOR: User = {
  id: 'u-editor',
  email: 'editor@studio.test',
  name: '',
  role: ROLE.editor,
  createdAt: 2
}

interface Call {
  method: string
  path: string
  body?: unknown
}

const stubUsersApi = (me: CurrentUser, failWith?: { status: number; code: string }) => {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url, 'http://x').pathname
      const method = init?.method ?? 'GET'
      if (method !== 'GET') {
        calls.push({ method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined })
        if (failWith) {
          return Response.json({ error: 'No', code: failWith.code }, { status: failWith.status })
        }
        return new Response(null, { status: method === 'POST' ? 201 : 204 })
      }
      if (path === '/api/v1/users/me') return Response.json(me)
      if (path === '/api/v1/users') return Response.json({ users: [OWNER, EDITOR] })
      if (path === '/api/auth/session')
        return Response.json({ mode: 'access', authenticated: true })
      return Response.json({ locales: ['en', 'es'], defaultLocale: 'en' })
    })
  )
  return calls
}

const asOwner: CurrentUser = { ...OWNER }
const asEditor: CurrentUser = { ...EDITOR }

describe('users page inviting', () => {
  afterEach(resetShell)

  it('lets an owner invite someone with a role, sending a normalised address', async () => {
    const calls = stubUsersApi(asOwner)
    await renderShell('/settings/users')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email address'), ' New@Studio.test ')
    await user.click(screen.getByRole('button', { name: 'Invite' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]).toEqual({
      method: 'POST',
      path: '/api/v1/users',
      body: { email: 'new@studio.test', role: ROLE.editor }
    })
  })

  it('refuses an address that is not an email without calling the server', async () => {
    const calls = stubUsersApi(asOwner)
    await renderShell('/settings/users')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email address'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Invite' }))
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('says so when the person already has access', async () => {
    stubUsersApi(asOwner, { status: 409, code: 'user_exists' })
    await renderShell('/settings/users')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email address'), 'editor@studio.test')
    await user.click(screen.getByRole('button', { name: 'Invite' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('That person already has access.')
  })
})

describe('users page changing and removing', () => {
  afterEach(resetShell)

  it('changes a role from the select', async () => {
    const calls = stubUsersApi(asOwner)
    await renderShell('/settings/users')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('combobox', { name: 'Role of editor@studio.test' }))
    await user.click(await screen.findByRole('option', { name: 'Owner' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]).toEqual({
      method: 'PATCH',
      path: '/api/v1/users/u-editor',
      body: { role: ROLE.owner }
    })
  })

  it('asks before removing, and removes on confirmation', async () => {
    const calls = stubUsersApi(asOwner)
    await renderShell('/settings/users')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Remove editor@studio.test' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(calls).toHaveLength(0)
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]).toMatchObject({ method: 'DELETE', path: '/api/v1/users/u-editor' })
  })

  it('explains why the last owner cannot be removed', async () => {
    stubUsersApi(asOwner, { status: 409, code: 'last_owner' })
    await renderShell('/settings/users')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Remove owner@studio.test' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
    expect(await within(dialog).findByText(/needs at least one owner/)).toBeInTheDocument()
  })
})

describe('users page access by role', () => {
  afterEach(resetShell)

  it('shows an editor the list and nothing to change', async () => {
    stubUsersApi(asEditor)
    await renderShell('/settings/users')
    expect(await screen.findByText('owner@studio.test')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument()
  })

  it('lists Users in the navigation for owners only', async () => {
    stubUsersApi(asOwner)
    await renderShell('/settings/users')
    expect(await screen.findByRole('link', { name: 'Users' })).toBeInTheDocument()
  })

  it('leaves Users out of the navigation for editors', async () => {
    stubUsersApi(asEditor)
    await renderShell('/settings/users')
    await screen.findByRole('link', { name: 'Settings' })
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })
})
