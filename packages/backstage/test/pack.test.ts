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

import { getTableName, is } from 'drizzle-orm'
import { SQLiteTable } from 'drizzle-orm/sqlite-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import * as schema from '../src/db/schema'
import { migrationNames } from './migrations'

const packageDir = join(import.meta.dirname, '..')
const repoRoot = join(import.meta.dirname, '../../..')
const adminHeaders = join(packageDir, '../../apps/admin/public/_headers')
const PACK = { timeoutMs: 120_000 } as const
const CONSUMER = {
  timeoutMs: 120_000,
  entries: {
    public: ['', '/admin', '/render', '/site', '/site/hono'],
    workerdOnly: ['/admin/entrypoint'],
    internal: ['/internal']
  },
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
const README = {
  path: join(repoRoot, 'README.md'),
  internalHeading: '## Internal entry',
  internalNotice: 'internal and not covered by SemVer',
  heading: (entry: string) => `### \`@studiobimo/backstage${entry}\``
} as const
const CONSUMER_MIGRATIONS = {
  timeoutMs: 180_000,
  binding: 'DB',
  localState: '.dev-state',
  dir: 'node_modules/@studiobimo/backstage/migrations',
  makefile: '-include node_modules/@studiobimo/backstage/backstage.mk\n',
  listTables: "SELECT name FROM sqlite_master WHERE type = 'table'",
  listApplied: 'SELECT name FROM d1_migrations ORDER BY id'
} as const
let out: string
let tarball: string
let namesByEntry: Record<string, string[]>

const tar = (flags: string, ...members: string[]) =>
  execFileSync('tar', [flags, tarball, ...members], { encoding: 'utf8' })

const linkDependencies = (from: string, to: string) => {
  for (const name of readdirSync(from).filter((entry) => entry !== '.bin')) {
    if (name === '@studiobimo') continue
    symlinkSync(join(from, name), join(to, name))
  }
}

const installPackage = (consumer: string) => {
  const installed = join(consumer, 'node_modules/@studiobimo/backstage')
  mkdirSync(installed, { recursive: true })
  execFileSync('tar', ['-xzf', tarball, '-C', installed, '--strip-components=1'])
  return installed
}

const loadableEntries = () => [...CONSUMER.entries.public, ...CONSUMER.entries.internal]
const allEntries = () => [...loadableEntries(), ...CONSUMER.entries.workerdOnly]

const loadEntries = () => `const names = {}
${loadableEntries()
  .map((entry) => `names['${entry}'] = Object.keys(await import('@studiobimo/backstage${entry}'))`)
  .join('\n')}
console.log(JSON.stringify(names))`

const readmeSection = (heading: string) => {
  const readme = readFileSync(README.path, 'utf8')
  const start = readme.indexOf(heading)
  expect(start, `${heading} in README.md`).toBeGreaterThanOrEqual(0)
  const rest = readme.slice(start + heading.length)
  return rest.slice(0, rest.search(/\n#{2,3} /))
}

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

  it('ships no site-specific assets in the SPA', () => {
    const client = tar('-tzf')
      .split('\n')
      .filter((file) => file.startsWith('package/dist/client/'))
    expect(client.filter((file) => /thumbnail/i.test(file))).toEqual([])
    expect(client.filter((file) => file.endsWith('.svg'))).toEqual([
      'package/dist/client/favicon.svg'
    ])
  })

  it('ships the migrations and the make target that applies them', () => {
    const files = tar('-tzf').split('\n')
    expect(files).toContain('package/backstage.mk')
    expect(files).toContain('package/migrations/0000_init.sql')
  })

  it('exports compiled javascript and declarations, and ships no source', () => {
    const files = tar('-tzf').split('\n')
    const manifest = JSON.parse(tar('-xzOf', 'package/package.json'))
    for (const entry of allEntries()) {
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
      installPackage(consumer)
      linkDependencies(join(packageDir, 'node_modules'), join(consumer, 'node_modules'))
      const imports = [
        ...CONSUMER.entries.public.map((entry, index) => [`entry${index}`, entry] as const),
        ...CONSUMER.entries.workerdOnly.map((entry, index) => [`workerd${index}`, entry] as const),
        ...CONSUMER.entries.internal.map((entry, index) => [`internal${index}`, entry] as const)
      ]
      const source = imports.map(
        ([name, entry]) => `import * as ${name} from '@studiobimo/backstage${entry}'`
      )
      const uses = imports.map(([name]) => name)
      writeFileSync(join(consumer, 'index.ts'), `${source.join('\n')}\nexport default [${uses}]\n`)
      writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify(CONSUMER.tsconfig))
      const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc')
      execFileSync('node', [tsc, '-p', consumer], { stdio: 'pipe' })
      const loaded = execFileSync('node', ['--input-type=module', '-e', loadEntries()], {
        cwd: consumer,
        encoding: 'utf8'
      })
      namesByEntry = JSON.parse(loaded)
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

describe('the README', () => {
  it('lists every runtime export of the public entries in the README', () => {
    for (const entry of CONSUMER.entries.public) {
      const listed = readmeSection(README.heading(entry))
      const unlisted = namesByEntry[entry]!.filter((name) => !listed.includes(`\`${name}\``))
      expect(unlisted, `${entry} exports missing from the README`).toEqual([])
    }
  })

  it('lists the class of each workerd-only entry in the README', () => {
    for (const entry of CONSUMER.entries.workerdOnly) {
      expect(readmeSection(README.heading(entry))).toContain('`AdminEntrypoint`')
    }
  })

  it('marks the internal entries as outside SemVer in the README', () => {
    for (const entry of CONSUMER.entries.internal) {
      const section = readmeSection(README.internalHeading)
      expect(section).toContain(`@studiobimo/backstage${entry}`)
      expect(section).toContain(README.internalNotice)
    }
  })
})

describe('the packed migrations', () => {
  it(
    'applies its migrations in a consumer through backstage.mk',
    () => {
      const consumer = join(out, 'migrating-consumer')
      installPackage(consumer)
      mkdirSync(join(consumer, 'node_modules/.bin'), { recursive: true })
      symlinkSync(
        join(repoRoot, 'node_modules/.bin/wrangler'),
        join(consumer, 'node_modules/.bin/wrangler')
      )
      const passThrough = join(consumer, 'run')
      writeFileSync(passThrough, '#!/bin/sh\nshift 2\nexec "$@"\n', { mode: 0o755 })
      writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true }))
      writeFileSync(join(consumer, 'Makefile'), CONSUMER_MIGRATIONS.makefile)
      writeFileSync(
        join(consumer, 'wrangler.jsonc'),
        JSON.stringify({
          name: 'consumer',
          compatibility_date: '2026-01-01',
          d1_databases: [
            {
              binding: CONSUMER_MIGRATIONS.binding,
              database_name: 'consumer',
              database_id: '00000000-0000-0000-0000-000000000000',
              migrations_dir: CONSUMER_MIGRATIONS.dir
            }
          ]
        })
      )
      const run = (...command: string[]) =>
        execFileSync(command[0]!, command.slice(1), { cwd: consumer, encoding: 'utf8' })
      run('make', 'migrate', `ROOT=${consumer}`, 'BACKSTAGE_ADMIN_DIR=.', `MISE=${passThrough}`)
      const names = (sql: string) => {
        const [{ results }] = JSON.parse(
          run(
            join(consumer, 'node_modules/.bin/wrangler'),
            'd1',
            'execute',
            CONSUMER_MIGRATIONS.binding,
            '--local',
            '--persist-to',
            join(consumer, CONSUMER_MIGRATIONS.localState),
            '--json',
            '--command',
            sql
          )
        ) as { results: { name: string }[] }[]
        return results.map((row) => row.name)
      }
      const declared = Object.values(schema)
        .filter((value) => is(value, SQLiteTable))
        .map(getTableName)
      expect(names(CONSUMER_MIGRATIONS.listApplied)).toEqual(
        migrationNames().map((name) => `${name}.sql`)
      )
      expect(names(CONSUMER_MIGRATIONS.listTables)).toEqual(expect.arrayContaining(declared))
    },
    CONSUMER_MIGRATIONS.timeoutMs
  )
})
