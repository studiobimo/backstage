export const BLOCK_VERSION = { localizedCta: 2 } as const

const LEGACY_CTA_LOCALE = 'en'

type Fields = Record<string, unknown>

const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSingleLink = (value: unknown) => isFields(value) && typeof value.href === 'string'

const localizeCta = (value: unknown) =>
  isSingleLink(value) ? { [LEGACY_CTA_LOCALE]: value } : value

const withLocalizedCta = (fields: unknown) =>
  isFields(fields) && 'cta' in fields ? { ...fields, cta: localizeCta(fields.cta) } : fields

const migrateFrom = (
  content: unknown,
  fromVersion: number,
  migrate: (fields: unknown) => unknown
) => (fromVersion < BLOCK_VERSION.localizedCta ? migrate(content) : content)

export const migrateCta = (content: unknown, fromVersion: number) =>
  migrateFrom(content, fromVersion, withLocalizedCta)

export const migrateColumnCtas = (content: unknown, fromVersion: number) =>
  migrateFrom(content, fromVersion, (fields) =>
    isFields(fields)
      ? { ...fields, left: withLocalizedCta(fields.left), right: withLocalizedCta(fields.right) }
      : fields
  )
