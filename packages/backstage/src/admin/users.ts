import { Hono } from 'hono'

import {
  findUserById,
  inviteUser,
  listUsers,
  removeUser,
  setUserRole,
  type Editor
} from '../db/users.ts'
import { API_ERROR } from '../errors.ts'
import { changeRoleSchema, inviteUserSchema } from '../users.ts'
import { requireOwner, withAccessName, type AccessEnv } from './auth.ts'
import { readJsonBody, respondWithError, RESPONSE_STATUS } from './respond.ts'

const USERS_PATH = { me: '/me', one: '/:id' } as const

const presentCurrentUser = ({ id, email, name, role }: Editor) => ({ id, email, name, role })

export const usersRoutes = () =>
  new Hono<AccessEnv>()
    .get('/', async (c) => c.json({ users: await listUsers(c.env.DB) }))
    .get(USERS_PATH.me, async (c) => c.json(presentCurrentUser(await withAccessName(c))))
    .post('/', requireOwner, async (c) => {
      const body = await readJsonBody(c, inviteUserSchema)
      if (!body.ok) return body.response
      const user = await inviteUser(c.env.DB, body.data)
      if (!user) return respondWithError(c, API_ERROR.userExists)
      return c.json(user, RESPONSE_STATUS.created)
    })
    .patch(USERS_PATH.one, requireOwner, async (c) => {
      const body = await readJsonBody(c, changeRoleSchema)
      if (!body.ok) return body.response
      const id = c.req.param('id')
      if (!(await findUserById(c.env.DB, id))) return respondWithError(c, API_ERROR.notFound)
      const user = await setUserRole(c.env.DB, id, body.data.role)
      return user ? c.json(user) : respondWithError(c, API_ERROR.lastOwner)
    })
    .delete(USERS_PATH.one, requireOwner, async (c) => {
      const id = c.req.param('id')
      if (!(await findUserById(c.env.DB, id))) return respondWithError(c, API_ERROR.notFound)
      if (!(await removeUser(c.env.DB, id))) return respondWithError(c, API_ERROR.lastOwner)
      return c.body(null, RESPONSE_STATUS.noContent)
    })
