import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import '@/i18n/config'

import { UserAvatar } from './user-avatar'

describe('UserAvatar', () => {
  it('shows two initials and is named after the user', () => {
    render(<UserAvatar name="Ada Lovelace" email="ada@example.com" />)
    const avatar = screen.getByRole('img', { name: 'Ada Lovelace' })
    expect(avatar).toHaveTextContent('AL')
  })

  it('sets the initials in the foreground colour so they stay readable on the fallback', () => {
    render(<UserAvatar name="Ada Lovelace" />)
    const fallback = screen.getByText('AL')
    expect(fallback).toHaveClass('text-foreground')
  })

  it('shows one initial for a one-word name', () => {
    render(<UserAvatar name="Ada" />)
    expect(screen.getByRole('img', { name: 'Ada' })).toHaveTextContent(/^A$/)
  })

  it('uses the email when there is no name', () => {
    render(<UserAvatar name="" email="grace.hopper@example.com" />)
    expect(screen.getByRole('img', { name: 'grace.hopper@example.com' })).toHaveTextContent('GH')
  })

  it('shows a generic icon with a generic name when nothing is known', () => {
    render(<UserAvatar />)
    const avatar = screen.getByRole('img', { name: 'Unknown user' })
    expect(avatar).toHaveTextContent('')
    expect(avatar.querySelector('svg')).not.toBeNull()
  })

  it('hides itself from assistive tech when decorative', () => {
    render(<UserAvatar name="Ada Lovelace" decorative />)
    expect(screen.queryByRole('img')).toBeNull()
  })
})
