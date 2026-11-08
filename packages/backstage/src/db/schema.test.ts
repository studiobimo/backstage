// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

import { beforeEach, describe, expect, it } from 'vitest'

const dir = new URL('../../migrations/', import.meta.url)

function migrate() {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    db.exec(readFileSync(new URL(file, dir), 'utf8').replaceAll('--> statement-breakpoint', ''))
  }
  return db
}

describe('the D1 migrations', () => {
  let db: DatabaseSync
  beforeEach(() => {
    db = migrate()
    db.exec(`INSERT INTO users (id, email) VALUES ('u1', 'a@example.com')`)
    db.exec(`INSERT INTO pages (id) VALUES ('p1'), ('p2')`)
  })

  it('creates every table', () => {
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
      .all()
      .map((r) => r.name)
    expect(tables).toEqual(['media', 'page_blocks', 'page_locales', 'pages', 'users'])
  })

  it('defaults a user to the editor role', () => {
    expect(db.prepare(`SELECT role FROM users`).get()).toEqual({ role: 'editor' })
  })

  it('keeps one slug per locale unique but lets two locales share it', () => {
    const add = db.prepare(`INSERT INTO page_locales (page_id, locale, slug) VALUES (?, ?, ?)`)
    add.run('p1', 'en', 'about')
    add.run('p1', 'es', 'about')
    expect(() => add.run('p2', 'en', 'about')).toThrow(/UNIQUE/)
  })

  it('allows several pages without a slug', () => {
    const add = db.prepare(`INSERT INTO page_locales (page_id, locale) VALUES (?, 'en')`)
    add.run('p1')
    expect(() => add.run('p2')).not.toThrow()
  })

  it('removes a page’s locales and blocks with it', () => {
    db.exec(`INSERT INTO page_locales (page_id, locale, slug) VALUES ('p1', 'en', 'a')`)
    db.exec(
      `INSERT INTO page_blocks (id, page_id, position, block, content) VALUES ('b1', 'p1', 0, 'hero', '{}')`
    )
    db.exec(`DELETE FROM pages WHERE id = 'p1'`)
    expect(db.prepare(`SELECT count(*) AS n FROM page_blocks`).get()).toEqual({ n: 0 })
    expect(db.prepare(`SELECT count(*) AS n FROM page_locales`).get()).toEqual({ n: 0 })
  })

  it('keeps media when its uploader is deleted', () => {
    db.exec(
      `INSERT INTO media (id, r2_key, filename, content_type, size, width, height, uploaded_by) VALUES ('m1', 'k', 'a.png', 'image/png', 1, 1, 1, 'u1')`
    )
    db.exec(`DELETE FROM users WHERE id = 'u1'`)
    expect(db.prepare(`SELECT uploaded_by FROM media`).get()).toEqual({ uploaded_by: null })
  })
})
