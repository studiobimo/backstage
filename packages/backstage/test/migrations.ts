import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const MIGRATIONS = {
  dir: join(import.meta.dirname, '../migrations'),
  journal: 'meta/_journal.json',
  statementBreakpoint: '--> statement-breakpoint'
} as const

export const migrationNames = (dir: string = MIGRATIONS.dir) =>
  (
    JSON.parse(readFileSync(join(dir, MIGRATIONS.journal), 'utf8')) as {
      entries: { tag: string }[]
    }
  ).entries.map((entry) => entry.tag)

export const migrationStatements = (dir: string = MIGRATIONS.dir) =>
  migrationNames(dir).flatMap((name) =>
    readFileSync(join(dir, `${name}.sql`), 'utf8')
      .split(MIGRATIONS.statementBreakpoint)
      .map((statement) => statement.trim())
      .filter(Boolean)
  )
