import { z } from 'zod'

import { useAppForm } from '@/components/form/app-form'

import type { JsonSchema } from './spec.ts'
import { type BlockValue, blockValue, withoutUndefined } from './value.ts'

export const blockValidator = (schema: JsonSchema) =>
  z.preprocess(withoutUndefined, z.fromJSONSchema(schema)).pipe(blockValue)

export type BlockValidator = ReturnType<typeof blockValidator>

interface BlockFormOptions {
  validator: BlockValidator
  initial: BlockValue
  onSubmit: (value: BlockValue) => void | Promise<void>
}

export function useBlockForm({ validator, initial, onSubmit }: BlockFormOptions) {
  const defaultValues: unknown = initial
  return useAppForm({
    defaultValues,
    validators: { onChange: validator, onSubmit: validator },
    onSubmit: ({ value }) => onSubmit(validator.parse(value))
  })
}

export type BlockFormApi = ReturnType<typeof useBlockForm>
