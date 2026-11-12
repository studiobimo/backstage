import type { z } from 'zod'

export const fieldErrorsOf = (result: z.ZodSafeParseResult<unknown>) =>
  result.success
    ? undefined
    : {
        fields: Object.fromEntries(
          result.error.issues.map((issue) => [issue.path.join('.'), [issue]])
        )
      }

export const localesWithErrors = (
  fieldMeta: Partial<Record<string, { errors: unknown[] }>>,
  locales: readonly string[]
) =>
  locales.filter((locale) =>
    Object.entries(fieldMeta).some(
      ([name, meta]) => name.endsWith(`.${locale}`) && (meta?.errors.length ?? 0) > 0
    )
  )
