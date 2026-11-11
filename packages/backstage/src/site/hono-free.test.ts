import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const SITE_DIR = import.meta.dirname

const sources = readdirSync(SITE_DIR).filter(
  (file) => /\.tsx?$/.test(file) && !file.endsWith('.test.ts')
)

describe('the site entry', () => {
  it('has sources to check', () => {
    expect(sources).toContain('index.ts')
  })

  it.each(sources)('%s does not import hono', (file) => {
    expect(readFileSync(join(SITE_DIR, file), 'utf8')).not.toMatch(/from ['"]hono/)
  })
})
