import { z } from 'zod'

/**
 * The field kinds zod cannot express alone. Each helper returns an ordinary zod schema carrying
 * a `backstage` marker in its metadata, which `z.toJSONSchema` copies into the JSON Schema the
 * admin builds its forms from. The marker is the contract between a block and the generic admin.
 */
export const fieldKinds = ['image', 'richText', 'link', 'localized'] as const
export type FieldKind = (typeof fieldKinds)[number]

const marked = <T extends z.ZodType>(schema: T, backstage: FieldKind): T =>
  schema.meta({ backstage }) as T

/** A reference to an uploaded asset (MED-1), by the id the media library gave it. */
export const image = () =>
  marked(z.object({ id: z.string().min(1), alt: z.string().default('') }), 'image')

/** Rich text as a string of the editor's serialized document. */
export const richText = () => marked(z.string(), 'richText')

/** A link to a page of the site (`/about`) or to another site (`https://…`). */
export const link = () =>
  marked(
    z.object({
      href: z.string().min(1),
      label: z.string().default('')
    }),
    'link'
  )

/**
 * One value per locale; every field not wrapped in this is shared across locales (BLK-3).
 * Locales are configured per site, so keys are open here. Which locales must be filled in, and
 * the fallback to the default one, are decided where the site's locales are known.
 */
export const localized = <T extends z.ZodType>(inner: T) =>
  marked(z.partialRecord(z.string(), inner), 'localized')
