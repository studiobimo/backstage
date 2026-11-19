import { useMemo } from 'react'

import { useLocalizedSchema } from '../block-form/use-localized-schema'
import type { FormOption } from './queries'

export function useLocalizedForm(form: FormOption | undefined) {
  const schema = useLocalizedSchema(form?.schema ?? { type: 'object' })
  return useMemo(() => form && { ...form, schema }, [form, schema])
}
