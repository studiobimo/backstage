import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const packageDir = join(import.meta.dirname, '..')
const adminHeaders = join(packageDir, '../../apps/admin/public/_headers')
const PACK = { timeoutMs: 120_000 } as const
const CONSUMER = {
  timeoutMs: 120_000,
  entries: ['', '/admin', '/render', '/site'],
  tsconfig: {
    compilerOptions: {
      target: 'es2023',
      module: 'esnext',
      moduleResolution: 'bundler',
      lib: ['ES2023', 'DOM'],
      types: [],
      jsx: 'react-jsx',
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      exactOptionalPropertyTypes: true,
      noUncheckedIndexedAccess: true
    },
    include: ['index.ts']
  }
} as const
let out: string
let tarball: string

const tar = (flags: string, ...members: string[]) =>
  execFileSync('tar', [flags, tarball, ...members], { encoding: 'utf8' })

const linkDependencies = (from: string, to: string) => {
  for (const name of readdirSync(from).filter((entry) => entry !== '.bin')) {
    if (name === '@studiobimo') continue
    symlinkSync(join(from, name), join(to, name))
  }
}

const loadEntries = () =>
  CONSUMER.entries.map((entry) => `await import('@studiobimo/backstage${entry}')`).join('\n')

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), 'backstage-pack-'))
  execFileSync('pnpm', ['pack', '--pack-destination', out], { cwd: packageDir, stdio: 'pipe' })
  const [name] = readdirSync(out).filter((file) => file.endsWith('.tgz'))
  if (!name) throw new Error(`pnpm pack wrote no tarball to ${out}`)
  tarball = join(out, name)
}, PACK.timeoutMs)
afterAll(() => rmSync(out, { recursive: true, force: true }))

describe('the packed package', () => {
  it('ships the admin SPA', () => {
    expect(tar('-tzf').split('\n')).toContain('package/dist/client/index.html')
  })

  it('ships the migrations and the make target that applies them', () => {
    const files = tar('-tzf').split('\n')
    expect(files).toContain('package/backstage.mk')
    expect(files).toContain('package/migrations/0000_init.sql')
  })

  it('exports compiled javascript and declarations, and ships no source', () => {
    const files = tar('-tzf').split('\n')
    const manifest = JSON.parse(tar('-xzOf', 'package/package.json'))
    for (const entry of CONSUMER.entries) {
      const { types, default: runtime } = manifest.exports[`.${entry}`]
      expect(files).toContain(`package/${types.slice(2)}`)
      expect(files).toContain(`package/${runtime.slice(2)}`)
    }
    expect(files).toContain('package/dist/lib/admin/index.js')
    expect(files.filter((file) => file.startsWith('package/src/'))).toEqual([])
  })

  it(
    'typechecks and loads from a consumer with a strict tsconfig',
    () => {
      const consumer = join(out, 'consumer')
      const installed = join(consumer, 'node_modules/@studiobimo/backstage')
      mkdirSync(installed, { recursive: true })
      execFileSync('tar', ['-xzf', tarball, '-C', installed, '--strip-components=1'])
      linkDependencies(join(packageDir, 'node_modules'), join(consumer, 'node_modules'))
      const source = CONSUMER.entries.map(
        (entry, index) => `import * as entry${index} from '@studiobimo/backstage${entry}'`
      )
      const uses = CONSUMER.entries.map((_, index) => `entry${index}`)
      writeFileSync(join(consumer, 'index.ts'), `${source.join('\n')}\nexport default [${uses}]\n`)
      writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify(CONSUMER.tsconfig))
      const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc')
      execFileSync('node', [tsc, '-p', consumer], { stdio: 'pipe' })
      execFileSync('node', ['--input-type=module', '-e', loadEntries()], {
        cwd: consumer,
        stdio: 'pipe'
      })
    },
    CONSUMER.timeoutMs
  )

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
