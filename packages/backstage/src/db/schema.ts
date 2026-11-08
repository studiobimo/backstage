import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

// Everything the admin keeps in D1. The site worker has no D1 binding (PUB-6); it reads the
// snapshots publish writes to KV. Times are Unix milliseconds.
// Set by the app on insert, not by a SQL default, so the schema holds no SQL of its own.
const now = () => Date.now()
const createdAt = () => integer('created_at').notNull().$defaultFn(now)

export const roles = ['owner', 'editor'] as const

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  role: text('role', { enum: roles }).notNull().default('editor'),
  createdAt: createdAt()
})

/** An uploaded image. The file is in R2 under `r2Key`, which is immutable (MED-1). */
export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  r2Key: text('r2_key').notNull().unique(),
  filename: text('filename').notNull(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  /** Decorative images need no alt text (MED-2). */
  decorative: integer('decorative', { mode: 'boolean' }).notNull().default(false),
  /** JSON object of alt text by locale. */
  alt: text('alt', { mode: 'json' }).$type<Record<string, string>>().notNull().default({}),
  uploadedBy: text('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt()
})

/** A page's draft. `version` rises on every save, so a stale save can be refused (PAG-4). */
export const pages = sqliteTable('pages', {
  id: text('id').primaryKey(),
  isHome: integer('is_home', { mode: 'boolean' }).notNull().default(false),
  version: integer('version').notNull().default(1),
  createdAt: createdAt(),
  updatedAt: integer('updated_at').notNull().$defaultFn(now).$onUpdateFn(now),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: integer('published_at'),
  publishedBy: text('published_by').references(() => users.id, { onDelete: 'set null' })
})

/** A page's slug and SEO fields for one locale. The home page has no slug (PAG-1, PAG-3). */
export const pageLocales = sqliteTable(
  'page_locales',
  {
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    slug: text('slug'),
    title: text('title').notNull().default(''),
    description: text('description').notNull().default(''),
    socialImageId: text('social_image_id').references(() => media.id, { onDelete: 'set null' })
  },
  (t) => [
    uniqueIndex('page_locales_pk').on(t.pageId, t.locale),
    // SQLite treats NULLs as distinct, so any number of home pages' null slugs is allowed.
    uniqueIndex('page_locales_slug').on(t.locale, t.slug)
  ]
)

/** One block on a page, in order. `content` is validated against the block's zod schema. */
export const pageBlocks = sqliteTable(
  'page_blocks',
  {
    id: text('id').primaryKey(),
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    block: text('block').notNull(),
    /** The block's schema version when `content` was saved (BLK-5). */
    schemaVersion: integer('schema_version').notNull().default(1),
    content: text('content', { mode: 'json' }).$type<unknown>().notNull()
  },
  (t) => [index('page_blocks_page').on(t.pageId, t.position)]
)
