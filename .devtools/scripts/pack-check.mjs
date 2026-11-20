#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { glyph, packMessages as say } from './strings.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const PACK = {
  packageDir: join(root, 'packages', 'backstage'),
  platformScheme: 'cloudflare:',
  registryAuthVariable: 'pnpm_config__auth',
  tempPrefix: 'backstage-pack-check-',
  consumer: {
    manifestName: 'package.json',
    entryDir: 'entries',
    tsconfigName: 'tsconfig.json'
  },
  typeScriptDependencies: [
    'typescript',
    '@types/node',
    '@types/react',
    '@types/react-dom',
    '@cloudflare/workers-types'
  ],
  fallbackVersions: { '@cloudflare/workers-types': '^4.0.0' },
  compilerOptions: {
    target: 'ES2023',
    module: 'ESNext',
    moduleResolution: 'bundler',
    jsx: 'react-jsx',
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: ['node', '@cloudflare/workers-types']
  }
}

const fail = (message) => {
  console.error(`${glyph.fail} ${message}`)
  process.exit(1)
}

const environmentWithoutRegistryAuth = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(([name]) => name !== PACK.registryAuthVariable)
  )

const run = (command, args, options = {}) => {
  const { status } = spawnSync(command, args, {
    stdio: 'inherit',
    env: environmentWithoutRegistryAuth(),
    ...options
  })
  if (status !== 0) fail(say.commandFailed(command, args))
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

const entryPointsOf = (manifest) => {
  const entries = Object.keys(manifest.publishConfig?.exports ?? {})
  return entries.length > 0 ? entries : fail(say.noEntryPoints)
}

const specifierOf = (name, entry) => (entry === '.' ? name : `${name}${entry.slice(1)}`)

const versionRangeIn = (manifest, name) =>
  manifest.peerDependencies?.[name] ??
  manifest.devDependencies?.[name] ??
  readJson(join(root, 'package.json')).devDependencies?.[name] ??
  PACK.fallbackVersions[name] ??
  fail(say.noVersion(name))

const packTarball = (destination) => {
  mkdirSync(destination, { recursive: true })
  run('pnpm', ['--dir', PACK.packageDir, 'pack', '--pack-destination', destination])
  const [tarball] = readdirSync(destination).filter((file) => file.endsWith('.tgz'))
  return tarball ? join(destination, tarball) : fail(say.noTarball(destination))
}

const consumerManifest = (manifest, tarball) => ({
  name: 'pack-check-consumer',
  private: true,
  type: 'module',
  dependencies: {
    [manifest.name]: `file:${tarball}`,
    ...Object.fromEntries(
      Object.keys(manifest.peerDependencies ?? {}).map((name) => [
        name,
        versionRangeIn(manifest, name)
      ])
    )
  },
  devDependencies: Object.fromEntries(
    PACK.typeScriptDependencies.map((name) => [name, versionRangeIn(manifest, name)])
  )
})

const entryFile = (specifier) =>
  `import * as entry from '${specifier}'\nexport const used: unknown = entry\n`

const writeConsumer = (dir, manifest, tarball, specifiers) => {
  const entryDir = join(dir, PACK.consumer.entryDir)
  mkdirSync(entryDir)
  writeFileSync(
    join(dir, PACK.consumer.manifestName),
    JSON.stringify(consumerManifest(manifest, tarball), null, 2)
  )
  writeFileSync(
    join(dir, PACK.consumer.tsconfigName),
    JSON.stringify({ compilerOptions: PACK.compilerOptions, include: [PACK.consumer.entryDir] })
  )
  specifiers.forEach((specifier, index) =>
    writeFileSync(join(entryDir, `entry-${index}.ts`), entryFile(specifier))
  )
}

const importScript = (specifiers) => `
const platformScheme = ${JSON.stringify(PACK.platformScheme)}
for (const specifier of ${JSON.stringify(specifiers)}) {
  import.meta.resolve(specifier)
  try {
    await import(specifier)
  } catch (error) {
    if (!String(error.message).includes(platformScheme)) throw error
  }
}
`

const importEntries = (dir, specifiers) => {
  const script = importScript(specifiers)
  run('node', ['--input-type=module', '-e', script], { cwd: dir })
}

const checkInConsumer = (dir, manifest, tarball, specifiers) => {
  writeConsumer(dir, manifest, tarball, specifiers)
  run('pnpm', ['install', '--ignore-workspace', '--no-frozen-lockfile'], { cwd: dir })
  run('pnpm', ['exec', 'tsc', '-p', PACK.consumer.tsconfigName], { cwd: dir })
  importEntries(dir, specifiers)
}

const main = () => {
  const manifest = readJson(join(PACK.packageDir, 'package.json'))
  const entries = entryPointsOf(manifest)
  const specifiers = entries.map((entry) => specifierOf(manifest.name, entry))
  const workDir = mkdtempSync(join(tmpdir(), PACK.tempPrefix))
  try {
    const tarball = packTarball(join(workDir, 'tarball'))
    const consumerDir = join(workDir, 'consumer')
    mkdirSync(consumerDir)
    checkInConsumer(consumerDir, manifest, tarball, specifiers)
    console.log(`${glyph.ok} ${say.passed(manifest.name, specifiers)}`)
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
}

main()
