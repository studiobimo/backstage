import { AUTH, ROLE } from '@studiobimo/backstage/internal'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { app, sent } from './magic-link-test-support'
import { openTestEnv } from './test-env'

const { dispose, db, env: testEnv } = await openTestEnv()
afterAll(dispose)

const ORIGIN = 'https://admin.example.com'
const OWNER = 'owner@studio.test'
const EDITOR = 'editor@studio.test'
const NEWCOMER = 'newcomer@studio.test'
const USERS_PATH = '/api/v1/users'
const UNKNOWN_ID = 'no-such-user'

const env = { ...testEnv.deployed, AUTH_MODE: AUTH.mode.magicLink, OWNER_EMAIL: OWNER }

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  app.request(
    `${ORIGIN}${path}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body)
    },
    env
  )

const signIn = async (email: string) => {
  await post(`/api/auth${AUTH.paths.requestLink}`, { email })
  const token = new URL(sent.at(-1)!.link).searchParams.get(AUTH.tokenParam)!
  const response = await post(`/api/auth${AUTH.paths.verify}`, { token })
  return response.headers.get('set-cookie')!.split(';')[0]!
}

const call = (cookie: string, method: string, path = USERS_PATH, body?: unknown) =>
  app.request(
    `${ORIGIN}${path}`,
    {
      method,
      headers: { cookie, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    },
    env
  )

const rows = async (table: string) =>
  (await db.prepare(`SELECT * FROM ${table}`).all<Record<string, unknown>>()).results

const addUser = (id: string, email: string, role: string) =>
  db
    .prepare('INSERT INTO users (id, email, role, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, email, role, Date.now())
    .run()

let ownerCookie: string
let editorCookie: string

beforeEach(async () => {
  sent.length = 0
  await db.batch(
    ['sessions', 'login_tokens', 'auth_attempts', 'users'].map((table) =>
      db.prepare(`DELETE FROM ${table}`)
    )
  )
  await addUser('editor-1', EDITOR, ROLE.editor)
  ownerCookie = await signIn(OWNER)
  editorCookie = await signIn(EDITOR)
})

describe('who becomes an owner', () => {
  it('makes an address listed in OWNER_EMAIL an owner on first sign-in', async () => {
    const me = await (await call(ownerCookie, 'GET', `${USERS_PATH}/me`)).json()
    expect(me).toMatchObject({ email: OWNER, role: ROLE.owner })
  })

  it('promotes an existing editor whose address is listed', async () => {
    await db.prepare('UPDATE users SET role = ? WHERE email = ?').bind(ROLE.editor, OWNER).run()
    const cookie = await signIn(OWNER)
    const me = await (await call(cookie, 'GET', `${USERS_PATH}/me`)).json()
    expect(me).toMatchObject({ role: ROLE.owner })
  })

  it('leaves everyone else an editor and gives strangers no link', async () => {
    const me = await (await call(editorCookie, 'GET', `${USERS_PATH}/me`)).json()
    expect(me).toMatchObject({ email: EDITOR, role: ROLE.editor })
    const before = sent.length
    await post(`/api/auth${AUTH.paths.requestLink}`, { email: NEWCOMER })
    expect(sent).toHaveLength(before)
  })

  it('treats the local DEV_AUTH developer as an owner', async () => {
    const response = await app.request(
      'http://localhost:5173/api/v1/users/me',
      {},
      testEnv.localDevelopment
    )
    expect(await response.json()).toMatchObject({ email: 'dev@localhost', role: ROLE.owner })
  })
})

describe('reading users', () => {
  it('lets an editor list everyone', async () => {
    const response = await call(editorCookie, 'GET')
    expect(response.status).toBe(200)
    const { users } = (await response.json()) as { users: { email: string; role: string }[] }
    expect(users.map((user) => user.email).sort()).toEqual([EDITOR, OWNER])
  })

  it('answers 401 without a session', async () => {
    const response = await app.request(`${ORIGIN}${USERS_PATH}`, {}, env)
    expect(response.status).toBe(401)
  })
})

describe('inviting', () => {
  it('lets an owner invite a person, who can then sign in as an editor', async () => {
    const response = await call(ownerCookie, 'POST', USERS_PATH, {
      email: ' Newcomer@Studio.TEST ',
      role: ROLE.editor
    })
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ email: NEWCOMER, role: ROLE.editor })
    const cookie = await signIn(NEWCOMER)
    const me = await (await call(cookie, 'GET', `${USERS_PATH}/me`)).json()
    expect(me).toMatchObject({ email: NEWCOMER, role: ROLE.editor })
  })

  it('lets an owner invite another owner', async () => {
    const response = await call(ownerCookie, 'POST', USERS_PATH, {
      email: NEWCOMER,
      role: ROLE.owner
    })
    expect(await response.json()).toMatchObject({ role: ROLE.owner })
  })

  it('refuses an editor', async () => {
    const response = await call(editorCookie, 'POST', USERS_PATH, {
      email: NEWCOMER,
      role: ROLE.editor
    })
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Forbidden', code: 'forbidden' })
    expect(await rows('users')).toHaveLength(2)
  })

  it('refuses an address that already has access, in any letter case', async () => {
    const response = await call(ownerCookie, 'POST', USERS_PATH, {
      email: 'EDITOR@studio.test',
      role: ROLE.owner
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'user_exists' })
  })

  it.each([
    { email: 'not-an-email', role: ROLE.editor },
    { email: NEWCOMER, role: 'admin' },
    { email: NEWCOMER }
  ])('refuses the invalid invite %j', async (body) => {
    expect((await call(ownerCookie, 'POST', USERS_PATH, body)).status).toBe(400)
  })
})

describe('changing a role', () => {
  it('lets an owner promote and demote', async () => {
    const promoted = await call(ownerCookie, 'PATCH', `${USERS_PATH}/editor-1`, {
      role: ROLE.owner
    })
    expect(await promoted.json()).toMatchObject({ id: 'editor-1', role: ROLE.owner })
    const demoted = await call(ownerCookie, 'PATCH', `${USERS_PATH}/editor-1`, {
      role: ROLE.editor
    })
    expect(await demoted.json()).toMatchObject({ role: ROLE.editor })
  })

  it('refuses an editor, even for their own role', async () => {
    const response = await call(editorCookie, 'PATCH', `${USERS_PATH}/editor-1`, {
      role: ROLE.owner
    })
    expect(response.status).toBe(403)
    expect(await rows('users')).toContainEqual(expect.objectContaining({ role: ROLE.editor }))
  })

  it('refuses to demote the last owner', async () => {
    const [owner] = (await rows('users')).filter((row) => row.email === OWNER)
    const response = await call(ownerCookie, 'PATCH', `${USERS_PATH}/${owner!.id}`, {
      role: ROLE.editor
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'last_owner' })
  })

  it('allows demoting an owner while another remains', async () => {
    await call(ownerCookie, 'PATCH', `${USERS_PATH}/editor-1`, { role: ROLE.owner })
    const [owner] = (await rows('users')).filter((row) => row.email === OWNER)
    const response = await call(ownerCookie, 'PATCH', `${USERS_PATH}/${owner!.id}`, {
      role: ROLE.editor
    })
    expect(response.status).toBe(200)
  })

  it('answers 404 for a user that does not exist', async () => {
    const response = await call(ownerCookie, 'PATCH', `${USERS_PATH}/${UNKNOWN_ID}`, {
      role: ROLE.editor
    })
    expect(response.status).toBe(404)
  })

  it('refuses a role that does not exist', async () => {
    const response = await call(ownerCookie, 'PATCH', `${USERS_PATH}/editor-1`, { role: 'admin' })
    expect(response.status).toBe(400)
  })
})

describe('removing', () => {
  it('removes a user and revokes their sessions at once', async () => {
    expect((await call(editorCookie, 'GET')).status).toBe(200)
    const response = await call(ownerCookie, 'DELETE', `${USERS_PATH}/editor-1`)
    expect(response.status).toBe(204)
    expect((await call(editorCookie, 'GET')).status).toBe(401)
    expect((await rows('sessions')).filter((row) => row.user_id === 'editor-1')).toHaveLength(0)
    expect((await rows('users')).map((row) => row.email)).toEqual([OWNER])
  })

  it('stops a removed person requesting another link', async () => {
    await call(ownerCookie, 'DELETE', `${USERS_PATH}/editor-1`)
    const before = sent.length
    await post(`/api/auth${AUTH.paths.requestLink}`, { email: EDITOR })
    expect(sent).toHaveLength(before)
  })

  it('refuses an editor', async () => {
    const response = await call(editorCookie, 'DELETE', `${USERS_PATH}/editor-1`)
    expect(response.status).toBe(403)
    expect(await rows('users')).toHaveLength(2)
  })

  it('refuses to remove the last owner, even when they remove themselves', async () => {
    const [owner] = (await rows('users')).filter((row) => row.email === OWNER)
    const response = await call(ownerCookie, 'DELETE', `${USERS_PATH}/${owner!.id}`)
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'last_owner' })
    expect((await call(ownerCookie, 'GET')).status).toBe(200)
  })

  it('lets an owner remove themselves while another owner remains', async () => {
    await call(ownerCookie, 'PATCH', `${USERS_PATH}/editor-1`, { role: ROLE.owner })
    const [owner] = (await rows('users')).filter((row) => row.email === OWNER)
    const response = await call(ownerCookie, 'DELETE', `${USERS_PATH}/${owner!.id}`)
    expect(response.status).toBe(204)
    expect((await call(ownerCookie, 'GET')).status).toBe(401)
  })

  it('answers 404 for a user that does not exist', async () => {
    expect((await call(ownerCookie, 'DELETE', `${USERS_PATH}/${UNKNOWN_ID}`)).status).toBe(404)
  })
})
