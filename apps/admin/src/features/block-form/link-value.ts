import { LINK } from '@studiobimo/backstage/internal'
import { z } from 'zod'

import type { BlockValue } from './value.ts'

export const LINK_MODE = { page: 'page', address: 'address' } as const

export type LinkMode = (typeof LINK_MODE)[keyof typeof LINK_MODE]

const pageLinkDraftSchema = z.object({
  kind: z.literal(LINK.kind.page),
  pageId: z.string().catch(''),
  label: z.string().catch('')
})

const labelSchema = z.object({ label: z.string().catch('') })

export const pageLinkDraftOf = (raw: unknown) => pageLinkDraftSchema.safeParse(raw).data

export const linkModeOf = (raw: unknown): LinkMode =>
  pageLinkDraftOf(raw) ? LINK_MODE.page : LINK_MODE.address

const labelOf = (raw: unknown) => labelSchema.catch({ label: '' }).parse(raw).label

export const linkValueFor = (mode: LinkMode, raw: unknown): BlockValue =>
  mode === LINK_MODE.page
    ? { kind: LINK.kind.page, pageId: '', label: labelOf(raw) }
    : { href: '', label: labelOf(raw) }
