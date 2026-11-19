import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'

const read = (path: string) => readFileSync(resolve(import.meta.dirname, path), 'utf8')
const parseJson = (path: string) => JSON.parse(read(path)) as Record<string, unknown>
const variableNames = (path: string) =>
  read(path)
    .split('\n')
    .map((line) => line.split('=')[0]!.trim())
    .filter(Boolean)

const siteConfig = parseJson('../wrangler.jsonc')
const environments = Object.entries({
  top: siteConfig,
  ...(siteConfig.env as Record<string, Record<string, unknown>>)
})
const adminSecrets = variableNames('../../admin/.dev.vars.example')
const adminBindings = (
  parseJson('../../admin/wrangler.jsonc').d1_databases as { binding: string }[]
).map(({ binding }) => binding)

const adminConfig = parseJson('../../admin/wrangler.jsonc')
const ADMIN_ENTRYPOINT = 'AdminEntrypoint'

interface ServiceBinding {
  binding: string
  service: string
  entrypoint?: string
}

const serviceBindingsIn = (config: Record<string, unknown>) =>
  (config.services ?? []) as ServiceBinding[]

const bindingsOutsideTheEntrypoint = (config: Record<string, unknown>, adminName: string) =>
  serviceBindingsIn(config)
    .filter(({ service, entrypoint }) => service !== adminName || entrypoint !== ADMIN_ENTRYPOINT)
    .map(({ binding }) => binding)

const adminNameIn = (environment: string) =>
  environment === 'top' ? String(adminConfig.name) : `${String(adminConfig.name)}-${environment}`

const draftAccessIn = (config: Record<string, unknown>) => [
  ...(config.d1_databases === undefined ? [] : ['d1_databases']),
  ...Object.keys((config.vars as Record<string, unknown> | undefined) ?? {}).filter((name) =>
    adminSecrets.includes(name)
  )
]

describe('site worker cannot see drafts', () => {
  it.each(environments)('has no D1 database and no admin secret in %s', (_name, config) => {
    expect(draftAccessIn(config)).toEqual([])
  })

  it('catches a D1 database or an admin secret', () => {
    expect(draftAccessIn({ d1_databases: [{ binding: 'DB' }] })).toEqual(['d1_databases'])
    expect(draftAccessIn({ vars: { [adminSecrets[0]!]: 'x' } })).toEqual([adminSecrets[0]])
  })

  it.each(environments)(
    'binds only to the admin entrypoint, never its default fetch, in %s',
    (name, config) => {
      expect(bindingsOutsideTheEntrypoint(config, adminNameIn(name))).toEqual([])
    }
  )

  it('catches a service binding without an entrypoint or to another worker', () => {
    const admin = 'backstage-admin'
    const whole = { services: [{ binding: 'ADMIN', service: admin }] }
    const other = {
      services: [{ binding: 'OTHER', service: 'other', entrypoint: ADMIN_ENTRYPOINT }]
    }
    expect(bindingsOutsideTheEntrypoint(whole, admin)).toEqual(['ADMIN'])
    expect(bindingsOutsideTheEntrypoint(other, admin)).toEqual(['OTHER'])
  })

  it('has the admin Worker export the entrypoint the site binds to', () => {
    expect(read('../../admin/worker/entry.ts')).toContain(`export { ${ADMIN_ENTRYPOINT} }`)
  })

  it('allows any other binding', () => {
    const others = {
      ai: { binding: 'AI' },
      vectorize: [{ binding: 'INDEX', index_name: 'docs' }],
      kv_namespaces: [{ binding: 'SITE', id: 'x' }],
      r2_buckets: [{ binding: 'MEDIA', bucket_name: 'm' }],
      vars: { ADMIN_ORIGIN: 'https://admin.test' }
    }
    expect(draftAccessIn(others)).toEqual([])
  })

  it('lists no admin secret in .dev.vars.example', () => {
    const names = variableNames('../.dev.vars.example')
    expect(names.filter((name) => adminSecrets.includes(name))).toEqual([])
  })

  it('is handed no D1 binding or admin secret at runtime', async () => {
    const platform = await getPlatformProxy<Record<string, unknown>>()
    const names = Object.keys(platform.env)
    await platform.dispose()
    expect(names.filter((name) => [...adminBindings, ...adminSecrets].includes(name))).toEqual([])
  })
})
