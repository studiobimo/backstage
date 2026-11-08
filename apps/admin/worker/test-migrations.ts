import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const MIGRATIONS_DIR = resolve(import.meta.dirname, '../../../packages/backstage/migrations')

export const migrationStatements = (...names: string[]) =>
  names.flatMap((name) =>
    readFileSync(resolve(MIGRATIONS_DIR, `${name}.sql`), 'utf8')
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
  )
