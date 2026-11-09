import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'

const BINDINGS_ALLOWED_ON_SITE = ['kv_namespaces', 'r2_buckets', 'vars']
const BINDING_KEYS = [
  'ai',
  'analytics_engine_datasets',
  'browser',
  'd1_databases',
  'dispatch_namespaces',
  'durable_objects',
  'hyperdrive',
  'images',
  'kv_namespaces',
  'mtls_certificates',
  'pipelines',
  'queues',
  'r2_buckets',
  'secrets_store_secrets',
  'send_email',
  'services',
  'vectorize',
  'vars',
  'version_metadata',
  'workflows'
]

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

describe('site worker cannot see drafts', () => {
  it.each(environments)('declares only KV, R2 and vars in %s', (_name, config) => {
    const declared = Object.keys(config).filter((key) => BINDING_KEYS.includes(key))
    expect(declared.filter((key) => !BINDINGS_ALLOWED_ON_SITE.includes(key))).toEqual([])
  })

  it.each(environments)('has no D1 database in %s', (_name, config) => {
    expect(config.d1_databases).toBeUndefined()
  })

  it.each(environments)('has no admin secret as a var in %s', (_name, config) => {
    const names = Object.keys((config.vars as Record<string, unknown> | undefined) ?? {})
    expect(names.filter((name) => adminSecrets.includes(name))).toEqual([])
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
