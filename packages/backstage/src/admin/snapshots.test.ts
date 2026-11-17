import { describe, expect, it } from 'vitest'

import { SITE_VERSION } from '../publishing.ts'
import { bumpSiteVersion } from './snapshots.ts'

describe('the site version', () => {
  it('changes on every bump', async () => {
    const records = new Map<string, string>()
    const kv = {
      put: async (key: string, value: string) => void records.set(key, value)
    } as unknown as KVNamespace
    await bumpSiteVersion(kv)
    const first = records.get(SITE_VERSION.key)
    await bumpSiteVersion(kv)
    expect(first).toBeDefined()
    expect(records.get(SITE_VERSION.key)).not.toBe(first)
  })
})
