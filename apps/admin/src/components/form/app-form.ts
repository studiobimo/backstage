import { createFormHook } from '@tanstack/react-form'

import { fieldContext, formContext } from './contexts.ts'
import { NumberField, SelectField, SwitchField, TextField } from './fields.tsx'

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, NumberField, SwitchField, SelectField },
  formComponents: {}
})
