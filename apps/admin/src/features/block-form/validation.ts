import { createContext, useContext } from 'react'
import { z } from 'zod'

import { useAppForm } from '@/components/form/app-form'

import type { JsonSchema } from './spec.ts'
import { type BlockValue, blockValue, fieldName, type Path, withoutUndefined } from './value.ts'

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

export const ShownIssuesContext = createContext<readonly Path[]>([])

export function useHasIssueWithin(name: string): boolean {
  const issues = useContext(ShownIssuesContext)
  return issues.some((path) => {
    const issueName = fieldName(path)
    return issueName.startsWith(`${name}.`) || issueName.startsWith(`${name}[`)
  })
}
