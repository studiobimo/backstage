import { z } from 'zod'

export const siteBrandSchema = z.object({
  logo: z.object({ id: z.string().min(1), alt: z.string() }).nullable(),
  themeColor: z.string().nullable()
})
export type SiteBrand = z.infer<typeof siteBrandSchema>

export const NO_SITE_BRAND: SiteBrand = { logo: null, themeColor: null }
