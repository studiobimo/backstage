import { DatabaseSync } from 'node:sqlite'

import { beforeEach, describe, expect, it } from 'vitest'

import migration from '../../migrations/0000_init.sql?raw'
import countChildren from './sql/count-children.sql?raw'
import deletePage from './sql/delete-page.sql?raw'
import deleteUser from './sql/delete-user.sql?raw'
import insertLocale from './sql/insert-locale.sql?raw'
import mediaUploader from './sql/media-uploader.sql?raw'
import seed from './sql/seed.sql?raw'
import tables from './sql/tables.sql?raw'
import userRole from './sql/user-role.sql?raw'

describe('the D1 migrations', () => {
  let db: DatabaseSync
  beforeEach(() => {
    db = new DatabaseSync(':memory:')
    db.exec('PRAGMA foreign_keys = ON')
    db.exec(migration)
    db.exec(seed)
  })

  it('creates every table', () => {
    expect(
      db
        .prepare(tables)
        .all()
        .map((r) => r.name)
    ).toEqual(['media', 'page_blocks', 'page_locales', 'pages', 'users'])
  })

  it('defaults a user to the editor role', () => {
    expect(db.prepare(userRole).get()).toEqual({ role: 'editor' })
  })

  it('keeps one slug per locale unique but lets two locales share it', () => {
    const add = db.prepare(insertLocale)
    add.run('p1', 'en', 'about')
    add.run('p1', 'es', 'about')
    expect(() => add.run('p2', 'en', 'about')).toThrow(/UNIQUE/)
  })

  it('allows several pages without a slug', () => {
    const add = db.prepare(insertLocale)
    add.run('p1', 'en', null)
    expect(() => add.run('p2', 'en', null)).not.toThrow()
  })

  it('removes a page’s locales and blocks with it', () => {
    expect(db.prepare(countChildren).get()).toEqual({ blocks: 1, locales: 1 })
    db.exec(deletePage)
    expect(db.prepare(countChildren).get()).toEqual({ blocks: 0, locales: 0 })
  })

  it('keeps media when its uploader is deleted', () => {
    db.exec(deleteUser)
    expect(db.prepare(mediaUploader).get()).toEqual({ uploaded_by: null })
  })
})
