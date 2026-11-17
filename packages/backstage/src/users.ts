import { z } from 'zod'

import { emailSchema } from './auth.ts'

export const ROLE = { owner: 'owner', editor: 'editor' } as const

export const ROLES = [ROLE.owner, ROLE.editor] as const

export const roleSchema = z.enum(ROLES)
export type Role = z.infer<typeof roleSchema>

export const currentUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: roleSchema
})
export type CurrentUser = z.infer<typeof currentUserSchema>

export const userSchema = currentUserSchema.extend({ createdAt: z.number() })
export type User = z.infer<typeof userSchema>

export const usersResponseSchema = z.object({ users: z.array(userSchema) })

export const inviteUserSchema = z.object({ email: emailSchema, role: roleSchema })
export type InviteUserInput = z.input<typeof inviteUserSchema>

export const changeRoleSchema = z.object({ role: roleSchema })
export type ChangeRoleInput = z.input<typeof changeRoleSchema>
