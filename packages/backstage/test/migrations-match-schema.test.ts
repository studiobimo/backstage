import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { getTableName, is } from 'drizzle-orm'
import { SQLiteSyncDialect, SQLiteTable, getTableConfig } from 'drizzle-orm/sqlite-core'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import * as schema from '../src/db/schema'
import { MIGRATIONS, migrationNames, migrationStatements } from './migrations'

const GENERATE = { timeoutMs: 120_000, noChangesMessage: 'No schema changes' } as const
const packageDir = join(import.meta.dirname, '..')
const schemaFile = join(packageDir, 'src/db/schema.ts')

interface Index {
  name: string
  unique: boolean
  columns: string[]
  where: string | null
}
interface TableShape {
  columns: Record<
    string,
    { type: string; notNull: boolean; primaryKey: boolean; default: string | null }
  >
  indexes: Index[]
  foreignKeys: { columns: string[]; table: string; foreignColumns: string[]; onDelete: string }[]
}

const byName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name))

const sqlLiteral = (value: unknown) => {
  if (typeof value === 'string') return `'${value}'`
  if (typeof value === 'object') return `'${JSON.stringify(value)}'`
  return String(value)
}

const declaredShape = (table: SQLiteTable): TableShape => {
  const dialect = new SQLiteSyncDialect()
  const config = getTableConfig(table)
  const columnNames = (columns: { name: string }[]) => columns.map((column) => column.name)
  const uniqueColumns = (config.columns as SQLiteColumn[]).filter((column) => column.isUnique)
  return {
    columns: Object.fromEntries(
      config.columns.map((column) => [
        column.name,
        {
          type: column.getSQLType(),
          notNull: column.notNull,
          primaryKey: column.primary,
          default: column.hasDefault && !column.defaultFn ? sqlLiteral(column.default) : null
        }
      ])
    ),
    indexes: byName([
      ...config.indexes.map(({ config: index }) => ({
        name: index.name,
        unique: index.unique,
        columns: columnNames(index.columns as { name: string }[]),
        where: index.where ? dialect.sqlToQuery(index.where).sql : null
      })),
      ...uniqueColumns.map((column) => ({
        name: column.uniqueName!,
        unique: true,
        columns: [column.name],
        where: null
      }))
    ]),
    foreignKeys: config.foreignKeys
      .map((foreignKey) => {
        const reference = foreignKey.reference()
        return {
          columns: columnNames(reference.columns),
          table: getTableName(reference.foreignTable),
          foreignColumns: columnNames(reference.foreignColumns),
          onDelete: foreignKey.onDelete ?? 'no action'
        }
      })
      .sort((a, b) => a.columns.join().localeCompare(b.columns.join()))
  }
}

const migratedShape = (db: DatabaseSync, table: string): TableShape => {
  const rows = (query: string) => db.prepare(query).all() as Record<string, never>[]
  const indexSql = (name: string) =>
    (
      db
        .prepare('SELECT sql FROM sqlite_master WHERE type = ? AND name = ?')
        .get('index', name) as {
        sql: string | null
      }
    ).sql
  return {
    columns: Object.fromEntries(
      rows(`PRAGMA table_info(\`${table}\`)`).map((column) => [
        column.name,
        {
          type: String(column.type).toLowerCase(),
          notNull: Boolean(column.notnull),
          primaryKey: Boolean(column.pk),
          default: column.dflt_value === null ? null : String(column.dflt_value)
        }
      ])
    ),
    indexes: byName(
      rows(`PRAGMA index_list(\`${table}\`)`)
        .filter((index) => index.origin !== 'pk')
        .map((index) => ({
          name: String(index.name),
          unique: Boolean(index.unique),
          columns: rows(`PRAGMA index_info(\`${index.name}\`)`).map((column) =>
            String(column.name)
          ),
          where: /\sWHERE\s+(.+)$/s.exec(indexSql(String(index.name)) ?? '')?.[1] ?? null
        }))
    ),
    foreignKeys: rows(`PRAGMA foreign_key_list(\`${table}\`)`)
      .map((foreignKey) => ({
        columns: [String(foreignKey.from)],
        table: String(foreignKey.table),
        foreignColumns: [String(foreignKey.to)],
        onDelete: String(foreignKey.on_delete).toLowerCase()
      }))
      .sort((a, b) => a.columns.join().localeCompare(b.columns.join()))
  }
}

const declaredTables = Object.values(schema).filter((value) => is(value, SQLiteTable))

const migratedTableNames = (db: DatabaseSync) =>
  (
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all() as { name: string }[]
  ).map((row) => row.name)

describe('the migrations against db/schema.ts', () => {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  for (const statement of migrationStatements()) db.exec(statement)

  it('creates exactly the tables the schema declares', () => {
    expect(migratedTableNames(db)).toEqual(declaredTables.map(getTableName).sort())
  })

  it.each(declaredTables.map((table) => [getTableName(table), table] as const))(
    'gives %s the columns, indexes and foreign keys the schema declares',
    (name, table) => {
      expect(migratedShape(db, name)).toEqual(declaredShape(table))
    }
  )

  it('lists in the journal every migration file, and no other', () => {
    const files = readdirSync(MIGRATIONS.dir)
      .filter((file) => file.endsWith('.sql'))
      .map((file) => file.replace(/\.sql$/, ''))
    expect(migrationNames()).toEqual(files.sort())
  })
})

describe('the drizzle-kit snapshots', () => {
  let workDir: string
  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'backstage-generate-'))
    cpSync(MIGRATIONS.dir, join(workDir, 'migrations'), { recursive: true })
    writeFileSync(
      join(workDir, 'drizzle.config.json'),
      JSON.stringify({
        dialect: 'sqlite',
        schema: schemaFile,
        out: './migrations'
      })
    )
  })
  afterAll(() => rmSync(workDir, { recursive: true, force: true }))

  it(
    'leave nothing for drizzle-kit generate to add',
    () => {
      const output = execFileSync(
        join(packageDir, 'node_modules/.bin/drizzle-kit'),
        ['generate', '--config', join(workDir, 'drizzle.config.json')],
        { cwd: workDir, encoding: 'utf8' }
      )
      expect(output).toContain(GENERATE.noChangesMessage)
      expect(readdirSync(join(workDir, 'migrations')).filter((f) => f.endsWith('.sql'))).toEqual(
        migrationNames().map((name) => `${name}.sql`)
      )
    },
    GENERATE.timeoutMs
  )
})
