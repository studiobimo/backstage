import { MEDIA } from '@studiobimo/backstage'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { uploadRequest } from '@/lib/upload-request'
import { testQueryClient } from '@/test/query-client'

import { IMAGE_REJECTION, ImageRejected, processImage } from './process-image'
import { UploadForm } from './upload-form'

vi.mock('./process-image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./process-image')>()),
  processImage: vi.fn()
}))

vi.mock('@/lib/upload-request', () => ({ uploadRequest: vi.fn() }))

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

const renderForm = (client = testQueryClient(), onUploaded = vi.fn()) =>
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <UploadForm onUploaded={onUploaded} />
      </ToastProvider>
    </QueryClientProvider>
  )

const pick = async (name = 'chair.jpg') =>
  userEvent.upload(screen.getByLabelText('Image'), new File(['x'], name, { type: 'image/jpeg' }))

const uploadButton = () => screen.getByRole('button', { name: 'Upload image' })

beforeEach(() => {
  stubUrls()
  vi.mocked(processImage).mockResolvedValue(processed as never)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('UploadForm picker', () => {
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

  it('clears the picker after a refusal so the same file can be chosen again', async () => {
    vi.mocked(processImage).mockRejectedValue(new ImageRejected(IMAGE_REJECTION.unreadable))
    renderForm()
    await pick('broken.jpg')
    await screen.findByRole('alert')
    expect((screen.getByLabelText('Image') as HTMLInputElement).files).toHaveLength(0)
    await pick('broken.jpg')
    await waitFor(() => expect(processImage).toHaveBeenCalledTimes(2))
  })

  it('requires alt text for each locale and marks the one that is missing', async () => {
    renderForm()
    await pick()
    await userEvent.type(
      (await screen.findAllByLabelText('Description of the image'))[0]!,
      'A chair'
    )
    await userEvent.click(uploadButton())
    expect(await screen.findByText('Fix')).toBeInTheDocument()
    expect(uploadRequest).not.toHaveBeenCalled()
  })
})

describe('UploadForm upload', () => {
  it('uploads the processed file with a description per locale', async () => {
    vi.mocked(uploadRequest).mockResolvedValue(created(false))
    const onUploaded = vi.fn()
    renderForm(testQueryClient(), onUploaded)
    await pick()
    await userEvent.type(
      (await screen.findAllByLabelText('Description of the image'))[0]!,
      'A chair'
    )
    await userEvent.click(screen.getByRole('tab', { name: /Español/ }))
    await userEvent.type(screen.getAllByLabelText('Description of the image')[1]!, 'Una silla')
    await userEvent.click(uploadButton())

    await waitFor(() => expect(uploadRequest).toHaveBeenCalledOnce())
    const [path, body] = vi.mocked(uploadRequest).mock.calls[0]!
    expect(path).toBe('/media')
    expect((body.get(MEDIA.upload.fileField) as File).name).toBe('chair.jpg')
    expect(JSON.parse(body.get(MEDIA.upload.metadataField) as string)).toEqual({
      decorative: false,
      alt: { en: 'A chair', es: 'Una silla' }
    })
    expect(await screen.findByText('Image uploaded')).toBeInTheDocument()
    expect(onUploaded).toHaveBeenCalledOnce()
  })

  it('needs no description for a decorative image', async () => {
    vi.mocked(uploadRequest).mockResolvedValue(created(true))
    renderForm()
    await pick()
    await userEvent.click(await screen.findByRole('switch', { name: /Decorative image/ }))
    expect(screen.queryByLabelText('Description of the image')).not.toBeInTheDocument()
    await userEvent.click(uploadButton())
    await waitFor(() => expect(uploadRequest).toHaveBeenCalledOnce())
  })

  it('shows how much of the image has been sent while it uploads', async () => {
    vi.mocked(uploadRequest).mockImplementation((_path, _body, onProgress) => {
      onProgress(0.5)
      return new Promise(() => {})
    })
    renderForm()
    await pick()
    await userEvent.click(await screen.findByRole('switch', { name: /Decorative image/ }))
    await userEvent.click(uploadButton())
    const progress = await screen.findByRole('progressbar')
    expect(progress).toHaveAttribute('aria-valuenow', '50')
    expect(progress).toHaveAccessibleName('Uploading')
    expect(uploadButton()).toBeDisabled()
  })

  it('shows the server refusal and keeps the image', async () => {
    vi.mocked(uploadRequest).mockRejectedValue(new ApiError('too_large', 'x'))
    renderForm()
    await pick()
    await userEvent.click(await screen.findByRole('switch', { name: /Decorative image/ }))
    await userEvent.click(uploadButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('too large')
    expect(uploadButton()).toBeEnabled()
  })
})

describe('UploadForm on a site with one locale', () => {
  it('asks for a single description and shows no language tabs', async () => {
    renderForm(testQueryClient({ locales: ['fr'], defaultLocale: 'fr' }))
    await pick()
    expect(await screen.findAllByLabelText('Description of the image')).toHaveLength(1)
    expect(screen.queryByRole('tab')).toBeNull()
  })
})
