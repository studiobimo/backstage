import { MEDIA } from '@studiobimo/backstage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'

import { IMAGE_REJECTION, ImageRejected, processImage } from './process-image'
import { UploadForm } from './upload-form'

vi.mock('./process-image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./process-image')>()),
  processImage: vi.fn()
}))

const processed = {
  width: 800,
  height: 600,
  contentType: 'image/jpeg',
  file: new File([new Uint8Array(2048)], 'chair.jpg', { type: 'image/jpeg' })
}

const created = (decorative: boolean) =>
  new Response(
    JSON.stringify({
      media: {
        id: 'm1',
        filename: 'chair.jpg',
        contentType: 'image/jpeg',
        size: 2048,
        width: 800,
        height: 600,
        decorative,
        alt: decorative ? {} : { en: 'A chair', es: 'Una silla' }
      }
    }),
    { status: 201 }
  )

const stubUrls = () => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
}

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <UploadForm />
      </ToastProvider>
    </QueryClientProvider>
  )

const pick = async (name = 'chair.jpg') =>
  userEvent.upload(screen.getByLabelText('Image'), new File(['x'], name, { type: 'image/jpeg' }))

const uploadButton = () => screen.getByRole('button', { name: 'Upload image' })

describe('UploadForm', () => {
  beforeEach(() => {
    stubUrls()
    vi.mocked(processImage).mockResolvedValue(processed as never)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('offers only the accepted types and keeps upload disabled until an image is ready', () => {
    renderForm()
    expect(screen.getByLabelText('Image')).toHaveAttribute(
      'accept',
      expect.stringContaining('image/avif')
    )
    expect(uploadButton()).toBeDisabled()
  })

  it('shows why an image was refused and does not enable upload', async () => {
    vi.mocked(processImage).mockRejectedValue(new ImageRejected(IMAGE_REJECTION.unsupported))
    renderForm()
    await pick('anim.gif')
    expect(await screen.findByRole('alert')).toHaveTextContent('Only JPEG, PNG, WebP and AVIF')
    expect(uploadButton()).toBeDisabled()
  })

  it('requires alt text for each locale and marks the one that is missing', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderForm()
    await pick()
    await userEvent.type(
      (await screen.findAllByLabelText('Description of the image'))[0]!,
      'A chair'
    )
    await userEvent.click(uploadButton())
    expect(await screen.findByText('Fix')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uploads the processed file with a description per locale', async () => {
    const fetchMock = vi.fn(async () => created(false))
    vi.stubGlobal('fetch', fetchMock)
    renderForm()
    await pick()
    await userEvent.type(
      (await screen.findAllByLabelText('Description of the image'))[0]!,
      'A chair'
    )
    await userEvent.click(screen.getByRole('tab', { name: /Español/ }))
    await userEvent.type(screen.getAllByLabelText('Description of the image')[1]!, 'Una silla')
    await userEvent.click(uploadButton())

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/media')
    const body = init.body as FormData
    expect((body.get(MEDIA.upload.fileField) as File).name).toBe('chair.jpg')
    expect(JSON.parse(body.get(MEDIA.upload.metadataField) as string)).toEqual({
      width: 800,
      height: 600,
      decorative: false,
      alt: { en: 'A chair', es: 'Una silla' }
    })
    expect(await screen.findByText('Image uploaded')).toBeInTheDocument()
  })

  it('needs no description for a decorative image', async () => {
    const fetchMock = vi.fn(async () => created(true))
    vi.stubGlobal('fetch', fetchMock)
    renderForm()
    await pick()
    await userEvent.click(await screen.findByRole('switch', { name: /Decorative image/ }))
    expect(screen.queryByLabelText('Description of the image')).not.toBeInTheDocument()
    await userEvent.click(uploadButton())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
  })

  it('shows the server refusal and keeps the image', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(JSON.stringify({ error: 'x', code: 'too_large' }), { status: 413 })
      )
    )
    renderForm()
    await pick()
    await userEvent.click(await screen.findByRole('switch', { name: /Decorative image/ }))
    await userEvent.click(uploadButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('too large')
    expect(uploadButton()).toBeEnabled()
  })
})
