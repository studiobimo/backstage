import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const packageDir = join(import.meta.dirname, '..')
const adminHeaders = join(packageDir, '../../apps/admin/public/_headers')
let out: string
let tarball: string

const tar = (flags: string, ...members: string[]) =>
  execFileSync('tar', [flags, tarball, ...members], { encoding: 'utf8' })

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), 'backstage-pack-'))
  execFileSync('pnpm', ['pack', '--pack-destination', out], { cwd: packageDir, stdio: 'pipe' })
  const [name] = readdirSync(out).filter((file) => file.endsWith('.tgz'))
  if (!name) throw new Error(`pnpm pack wrote no tarball to ${out}`)
  tarball = join(out, name)
}, 120_000)
afterAll(() => rmSync(out, { recursive: true, force: true }))

describe('the packed package', () => {
  it('ships the admin SPA', () => {
    expect(tar('-tzf').split('\n')).toContain('package/dist/client/index.html')
  })

  it("ships the SPA's _headers as apps/admin has it", () => {
    const shipped = tar('-xzOf', 'package/dist/client/_headers')
    expect(shipped).toBe(readFileSync(adminHeaders, 'utf8'))
    expect(shipped).toContain('Content-Security-Policy:')
  })

  it('loads no data: URI from its stylesheets', () => {
    const stylesheets = tar('-tzf')
      .split('\n')
      .filter((file) => file.startsWith('package/dist/client/') && file.endsWith('.css'))
    expect(stylesheets.length).toBeGreaterThan(0)
    for (const file of stylesheets) {
      expect(tar('-xzOf', file)).not.toMatch(/url\(\s*["']?data:/)
    }
  })
})
