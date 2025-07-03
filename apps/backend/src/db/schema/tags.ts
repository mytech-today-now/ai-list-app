import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core'
import { pgTable, varchar, timestamp, unique as pgUnique } from 'drizzle-orm/pg-core'

// SQLite Schema
export const tagsTableSqlite = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name', { length: 255 }).notNull(),
  color: text('color', { length: 7 }), // hex color code
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
}, (table) => ({
  nameIdx: index('idx_tags_name').on(table.name),
  nameUnique: unique('unique_tag_name').on(table.name)
}))

// PostgreSQL Schema
export const tagsTablePg = pgTable('tags', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 7 }), // hex color code
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  nameIdx: index('idx_tags_name_pg').on(table.name),
  nameUnique: pgUnique('unique_tag_name_pg').on(table.name)
}))

// Export the appropriate table based on environment
export const tagsTable = process.env.NODE_ENV === 'production' ? tagsTablePg : tagsTableSqlite

// Types
export type Tag = typeof tagsTable.$inferSelect
export type NewTag = typeof tagsTable.$inferInsert
