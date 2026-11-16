import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { aboutPage } from '@/test/fixtures'

import { PublishNotes } from './publish-notes'

const WHEN = Date.UTC(2026, 0, 15, 12)

const renderNotes = (page: Parameters<typeof PublishNotes>[0]['page']) =>
  render(
    <PublishNotes
      page={page}
      dirty={false}
      changed={false}
      error={null}
      blocks={[]}
      hintId="hint"
    />
  )

describe('PublishNotes attribution', () => {
  it('names who last saved and who published', () => {
    renderNotes({
      ...aboutPage,
      updatedAt: WHEN,
      updatedBy: 'Sam Saver',
      publishedAt: WHEN,
      publishedBy: 'Pat Publisher'
    })
    expect(screen.getByText(/Last saved by Sam Saver on/)).toBeInTheDocument()
    expect(screen.getByText(/published by Pat Publisher/)).toBeInTheDocument()
  })

  it('says someone when the saver or publisher is gone', () => {
    renderNotes({ ...aboutPage, updatedAt: WHEN, publishedAt: WHEN })
    expect(screen.getByText(/Last saved by someone on/)).toBeInTheDocument()
    expect(screen.getByText(/published by someone/)).toBeInTheDocument()
  })

  it('shows no save line for a record that was never saved', () => {
    renderNotes({ publishedAt: null, publishedBy: null })
    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument()
    expect(screen.getByText(/Not live/)).toBeInTheDocument()
  })
})
