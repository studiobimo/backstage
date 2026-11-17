import { db } from './pages-test-support'

export const ATTRIBUTION = {
  saver: { id: 'user-saver', email: 'saver@example.com', name: 'Sam Saver' },
  publisher: { id: 'user-publisher', email: 'publisher@example.com', name: '' }
} as const

export const addUsers = () =>
  db.batch(
    Object.values(ATTRIBUTION).map(({ id, email, name }) =>
      db
        .prepare('INSERT OR REPLACE INTO users (id, email, name, created_at) VALUES (?, ?, ?, 0)')
        .bind(id, email, name)
    )
  )

export const attribute = (
  table: 'pages' | 'entries',
  id: string,
  column: 'updated_by' | 'published_by',
  userId: string | null
) => db.prepare(`UPDATE ${table} SET ${column} = ? WHERE id = ?`).bind(userId, id).run()
