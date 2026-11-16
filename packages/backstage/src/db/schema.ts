import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import type { SiteVersions } from '../site-publishing.ts'
import type { MissingByLocale } from '../translations.ts'

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

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  r2Key: text('r2_key').notNull().unique(),
  filename: text('filename').notNull(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  decorative: integer('decorative', { mode: 'boolean' }).notNull().default(false),
  alt: text('alt', { mode: 'json' }).$type<Record<string, string>>().notNull().default({}),
  uploadedBy: text('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt()
})

const publication = () => ({
  publishedAt: integer('published_at'),
  publishedVersion: integer('published_version'),
  publishedBy: text('published_by').references(() => users.id, { onDelete: 'set null' })
})

export const pages = sqliteTable(
  'pages',
  {
    id: text('id').primaryKey(),
    isHome: integer('is_home', { mode: 'boolean' }).notNull().default(false),
    layout: text('layout').notNull().default('default'),
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: integer('updated_at').notNull().$defaultFn(now).$onUpdateFn(now),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...publication(),
    missingTranslations: text('missing_translations', { mode: 'json' }).$type<MissingByLocale>()
  },
  (t) => [
    uniqueIndex('pages_single_home')
      .on(t.isHome)
      .where(sql`is_home = 1`)
  ]
)

export const pageLocales = sqliteTable(
  'page_locales',
  {
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    slug: text('slug'),
    title: text('title').notNull().default(''),
    seoTitle: text('seo_title').notNull().default(''),
    description: text('description').notNull().default(''),
    socialImageId: text('social_image_id').references(() => media.id, { onDelete: 'set null' })
  },
  (t) => [
    uniqueIndex('page_locales_pk').on(t.pageId, t.locale),
    uniqueIndex('page_locales_slug').on(t.locale, t.slug)
  ]
)

export const pageBlocks = sqliteTable(
  'page_blocks',
  {
    id: text('id').primaryKey(),
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    block: text('block').notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
    content: text('content', { mode: 'json' }).$type<unknown>().notNull()
  },
  (t) => [index('page_blocks_page').on(t.pageId, t.position)]
)

const versionStamp = () => ({
  version: integer('version').notNull().default(1),
  updatedAt: integer('updated_at').notNull().$defaultFn(now),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' })
})

export const siteSettings = sqliteTable('site_settings', {
  id: text('id').primaryKey(),
  content: text('content', { mode: 'json' }).$type<unknown>().notNull(),
  ...versionStamp()
})

export const siteBlocks = sqliteTable('site_blocks', {
  slot: text('slot').primaryKey(),
  block: text('block').notNull(),
  schemaVersion: integer('schema_version').notNull().default(1),
  content: text('content', { mode: 'json' }).$type<unknown>().notNull(),
  ...versionStamp()
})

export const sitePublication = sqliteTable('site_publication', {
  id: text('id').primaryKey(),
  publishedAt: integer('published_at').notNull(),
  publishedBy: text('published_by').references(() => users.id, { onDelete: 'set null' }),
  versions: text('versions', { mode: 'json' }).$type<SiteVersions>().notNull()
})

export const entries = sqliteTable(
  'entries',
  {
    id: text('id').primaryKey(),
    collection: text('collection').notNull(),
    version: integer('version').notNull().default(1),
    schemaVersion: integer('schema_version').notNull().default(1),
    content: text('content', { mode: 'json' }).$type<unknown>().notNull(),
    label: text('label', { mode: 'json' }).$type<Record<string, string>>().notNull().default({}),
    ...publication(),
    publishedContent: text('published_content', { mode: 'json' }).$type<unknown>(),
    publishedSchemaVersion: integer('published_schema_version'),
    createdAt: createdAt(),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedAt: integer('updated_at').notNull().$defaultFn(now),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' })
  },
  (t) => [index('entries_collection').on(t.collection, t.updatedAt)]
)
