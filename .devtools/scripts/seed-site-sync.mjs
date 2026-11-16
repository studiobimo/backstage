import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)

const SYNC = {
  root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'),
  source: 'apps/admin',
  target: 'apps/site',
  binding: 'SITE',
  maxBufferBytes: 256 * 1024 * 1024,
  batchSize: 50
}

const wrangler = async (app, args) => {
  const { stdout } = await run(
    'pnpm',
    ['exec', 'wrangler', 'kv', ...args, '--binding', SYNC.binding, '--local'],
    { cwd: path.join(SYNC.root, app), maxBuffer: SYNC.maxBufferBytes }
  )
  return stdout
}

const listKeys = async (app) => JSON.parse(await wrangler(app, ['key', 'list']))

const chunksOf = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size)
  )

const withJsonFile = async (value, use) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'backstage-site-sync-'))
  const file = path.join(directory, 'keys.json')
  try {
    await writeFile(file, JSON.stringify(value))
    return await use(file)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

const readValues = async (app, names) => {
  const values = {}
  for (const batch of chunksOf(names, SYNC.batchSize)) {
    const read = await withJsonFile(batch, async (file) =>
      JSON.parse(await wrangler(app, ['bulk', 'get', file]))
    )
    for (const name of batch) values[name] = read[name].value
  }
  return values
}

const toEntry = (key, value) => ({
  key: key.name,
  value: Buffer.from(value, 'utf8').toString('base64'),
  base64: true,
  ...(key.expiration === undefined ? {} : { expiration: key.expiration }),
  ...(key.metadata === undefined ? {} : { metadata: key.metadata })
})

const copyKeys = async (keys) => {
  const values = await readValues(
    SYNC.source,
    keys.map(({ name }) => name)
  )
  const entries = keys.map((key) => toEntry(key, values[key.name]))
  for (const batch of chunksOf(entries, SYNC.batchSize)) {
    await withJsonFile(batch, (file) => wrangler(SYNC.target, ['bulk', 'put', file]))
  }
}

const deleteKeys = async (names) => {
  for (const batch of chunksOf(names, SYNC.batchSize)) {
    await withJsonFile(batch, (file) => wrangler(SYNC.target, ['bulk', 'delete', file, '--force']))
  }
}

export const syncSite = async (log) => {
  const [source, target] = await Promise.all([listKeys(SYNC.source), listKeys(SYNC.target)])
  const wanted = new Set(source.map(({ name }) => name))
  const stale = target.map(({ name }) => name).filter((name) => !wanted.has(name))
  if (source.length > 0) await copyKeys(source)
  if (stale.length > 0) await deleteKeys(stale)
  log(`site-sync: ${source.length} keys copied to ${SYNC.target}, ${stale.length} removed`)
}
